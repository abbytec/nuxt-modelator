import type { ClientMiddleware } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";

// ======= HELPER FUNCTIONS =======

function toPlain<T>(value: T): T {
	try {
		return JSON.parse(JSON.stringify(value));
	} catch {
		return value;
	}
}

// ======= MIDDLEWARE DE MANEJO DE DATOS =======

export function createSaveOnStoreMiddleware(config?: { to?: "entity" | "all" | "both"; position?: "push" | "unshift" }): ClientMiddleware {
	return async (ctx, next) => {
		// Ejecutar próximos middlewares primero para obtener los datos
		await next();

		const raw = ctx.args?.data ?? ctx.args ?? null;
		const data = toPlain(raw);

		console.log("[client-data] saveOnStore - raw:", raw);
		console.log("[client-data] saveOnStore - data:", data);

		const to = config?.to ?? "both";
		if (to === "entity" || to === "both") {
			ctx.state.entity = data;
		}
		if (to === "all" || to === "both") {
			if (!Array.isArray(ctx.state.all)) ctx.state.all = [];
			if (config?.position === "unshift") ctx.state.all.unshift(data);
			else ctx.state.all.push(data);
		}
		console.log("[client-data] saveOnStore - state.all after:", ctx.state.all);
	};
}

export function createPopulateArrayMiddleware(config?: { from?: "data" | "httpNormalizedData" | "entity" }): ClientMiddleware {
	return async (ctx, next) => {
		// Ejecutar próximos middlewares primero para obtener los datos
		await next();

		const from = config?.from ?? "data";
		const source = ctx.args?.[from] ?? ctx.state?.[from] ?? ctx.args?.data ?? null;
		const data = toPlain(source);

		console.log("[client-data] populateArray - source:", source);

		if (Array.isArray(data)) {
			// Sobrescribir completamente el array
			ctx.state.all = data.filter((item) => item != null); // Filtrar nulls/undefined
			console.log("[client-data] populateArray - populated with", ctx.state.all.length, "items");
		} else if (data != null) {
			// Si es un objeto único, ponerlo en entity
			ctx.state.entity = data;
			console.log("[client-data] populateArray - set entity:", data);
		}
	};
}

export function createGetFromPluralFilteredMiddleware(filter: Record<string, any>): ClientMiddleware {
	return async (ctx, next) => {
		const list: Array<any> = Array.isArray(ctx.state.all) ? ctx.state.all : [];
		console.debug(`[client-data] getFromPluralFiltered - filter: ${JSON.stringify(filter)}, items: ${JSON.stringify(list)}`);

		const resolvedFilter: Record<string, any> = {};
		for (const [k, v] of Object.entries(filter || {})) {
			if (typeof v === "string" && v.startsWith("$")) {
				const key = v.slice(1);
				resolvedFilter[k] = ctx.args?.[key] ?? undefined;
			} else {
				resolvedFilter[k] = v;
			}
		}

		const item = list.find((it: any) => {
			return Object.entries(resolvedFilter).every(([k, v]) => it?.[k] === v);
		});

		console.debug("[client-data] getFromPluralFiltered - found item:", item);

		// Almacenar el resultado antes de continuar
		if (item) {
			ctx.state.foundItem = item;
		}

		await next();

		// Si no se llamó done() en los middlewares siguientes, usar nuestro resultado
		if (item && !ctx.state.__doneCallled) {
			ctx.done(item ?? null);
		}
	};
}

export function createAddToPluralMiddleware(config?: { position?: "push" | "unshift"; to?: "entity" | "all" | "both" }): ClientMiddleware {
	return async (ctx, next) => {
		// Ejecutar middlewares siguientes primero para obtener/procesar datos
		await next();

		const raw = ctx.args?.data ?? ctx.args ?? null;
		const data = toPlain(raw);
		console.debug(`[client-data] adding to ${ctx.state.__plural} - data:`, data);

		if (!Array.isArray(ctx.state.all)) ctx.state.all = [];
		if (config?.position === "unshift") ctx.state.all.unshift(data);
		else ctx.state.all.push(data);
	};
}

export function createLogRequestMiddleware(config?: {
	logLevel?: "debug" | "info" | "warn" | "error";
	includeArgs?: boolean;
}): ClientMiddleware {
	return async (ctx, next) => {
		const logLevel = config?.logLevel || "info";
		const includeArgs = config?.includeArgs ?? true;

		if (typeof console !== "undefined") {
			const logData: any = { op: ctx.op, model: ctx.model };
			if (includeArgs) {
				logData.args = ctx.args;
			}

			console[logLevel](`[client-request] ${ctx.op} on ${ctx.model}`, logData);
		}

		await next();
	};
}

// ======= MIDDLEWARE DE HTTP REQUESTS =======

export function createPostRequestMiddleware(config?: { headers?: Record<string, string>; method?: string; baseUrl?: string }): ClientMiddleware {
	return async (ctx, next) => {
		// Ejecutar middlewares anteriores primero (para validación, etc.)
		await next();

		try {
			const basePath: string = ctx.state.__basePath || "/api";
			const method = (config?.method || (ctx.op === "create" ? "POST" : "GET")).toUpperCase();
			const plural: string = ctx.state.__plural || `${ctx.model}s`;
			const url = method === "POST" ? `${basePath}/${plural}` : `${basePath}/${ctx.model}`;

			// Preferir validatedData del state, luego ctx.args.data, luego ctx.args
			const body = method === "POST" ? ctx.state.validatedData ?? ctx.args?.data ?? ctx.args : undefined;

			console.debug(`[client-http] postRequest - [${method}]: ${url}`, body);

			const $fetch = (await import("ofetch")).$fetch;
			const res = await $fetch(url, {
				method,
				body,
				headers: {
					...(config?.headers || {}),
					"x-demo-auth": "true",
				},
			});

			console.debug("[client-http] postRequest - response:", res);

			// Normalizar respuesta
			const normalized =
				res && typeof res === "object" && Object.keys(res).length === 1 && res.ok === true
					? ctx.state.validatedData ?? body ?? res
					: res;

			// Almacenar resultado para próximos middlewares
			ctx.args.data = normalized;
			ctx.state.httpResponse = res;
			ctx.state.httpNormalizedData = normalized;
		} catch (e) {
			console.warn("[client-http] postRequest error", e);
			throw e;
		}
	};
}

export function createCacheMiddleware(config?: {
	ttl?: number; // Time to live en ms
	key?: string; // Cache key personalizada
	storage?: "memory" | "localStorage" | "sessionStorage";
}): ClientMiddleware {
	const storage = config?.storage || "memory";
	const ttl = config?.ttl || 60000; // 1 minuto por defecto

	// Simple in-memory cache
	const memoryCache = new Map<string, { data: any; expiry: number }>();

	return async (ctx, next) => {
		const cacheKey = config?.key || `${ctx.model}.${ctx.op}.${JSON.stringify(ctx.args)}`;
		const now = Date.now();

		// Intentar obtener desde cache
		let cachedItem: { data: any; expiry: number } | null = null;

		if (storage === "memory") {
			cachedItem = memoryCache.get(cacheKey) || null;
		} else if (storage === "localStorage" && typeof localStorage !== "undefined") {
			try {
				const stored = localStorage.getItem(cacheKey);
				cachedItem = stored ? JSON.parse(stored) : null;
			} catch {}
		} else if (storage === "sessionStorage" && typeof sessionStorage !== "undefined") {
			try {
				const stored = sessionStorage.getItem(cacheKey);
				cachedItem = stored ? JSON.parse(stored) : null;
			} catch {}
		}

		// Verificar si el cache es válido
		if (cachedItem && cachedItem.expiry > now) {
			console.debug(`[client-cache] Cache hit for: ${cacheKey}`);
			ctx.state.cachedData = cachedItem.data;
			ctx.done(cachedItem.data);
			return;
		}

		// Cache miss o expirado - ejecutar middlewares siguientes
		await next();

		// Almacenar en cache si hay datos
		const dataToCache = ctx.state.httpNormalizedData || ctx.args?.data || ctx.state.entity;
		if (dataToCache) {
			const cacheItem = { data: dataToCache, expiry: now + ttl };

			if (storage === "memory") {
				memoryCache.set(cacheKey, cacheItem);
			} else if (storage === "localStorage" && typeof localStorage !== "undefined") {
				try {
					localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
				} catch {}
			} else if (storage === "sessionStorage" && typeof sessionStorage !== "undefined") {
				try {
					sessionStorage.setItem(cacheKey, JSON.stringify(cacheItem));
				} catch {}
			}

			console.debug(`[client-cache] Cached data for: ${cacheKey}`);
		}
	};
}

// ======= AUTO-REGISTRO =======
autoRegisterFromModule(
	{
		createSaveOnStoreMiddleware,
		createPopulateArrayMiddleware,
		createGetFromPluralFilteredMiddleware,
		createAddToPluralMiddleware,
		createLogRequestMiddleware,
		createPostRequestMiddleware,
		createCacheMiddleware,
	},
	"client",
	"data-middlewares"
);
