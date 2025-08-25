import type { HybridMiddleware } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";

// ======= MIDDLEWARE POST REQUEST (HÍBRIDO) =======
// Este middleware maneja la separación cliente/servidor:
// - Cliente: Hace llamada HTTP al endpoint
// - Servidor: Ejecuta middlewares anidados (DB, auth, etc.)

export function createPostRequestMiddleware(config?: {
	headers?: Record<string, string>;
	method?: string;
	baseUrl?: string;
	middlewares?: any[]; // Middlewares que solo se ejecutan en servidor
}): HybridMiddleware {
	return async (ctx, next) => {
		if (ctx.stage === "server") {
			// ======= EJECUCIÓN EN SERVIDOR =======
			// Ejecutar middlewares anidados si están especificados
			if (config?.middlewares && config.middlewares.length > 0) {
				console.log(`[server-postRequest] Executing ${config.middlewares.length} nested middlewares for ${ctx.model}.${ctx.op}`);

				// Importar dinámicamente el executor para evitar dependencias circulares
				const { executeMiddlewaresWithComposition } = await import("../composition-executor.js");
				await executeMiddlewaresWithComposition(config.middlewares, ctx);
			}

			// Continuar con el siguiente middleware en la cadena del servidor
			await next();
		} else {
			// ======= EJECUCIÓN EN CLIENTE =======
			// Ejecutar middlewares anteriores primero (para validación, etc.)
			await next();

			try {
				const basePath: string = ctx.state.__basePath || "/api";
				const inferred = ctx.op === "create" ? "POST" : ctx.op === "update" ? "PUT" : ctx.op === "delete" ? "DELETE" : "GET";
				const method = (config?.method || inferred).toUpperCase();
				const plural: string = ctx.state.__plural || `${ctx.model}s`;
				const url = method === "POST" ? `${basePath}/${plural}` : `${basePath}/${ctx.model}`;

				// Preferir validatedData del state, luego ctx.args.data, luego ctx.args
				const body =
					method === "POST" || method === "PUT" || method === "PATCH"
						? ctx.state.validatedData ?? ctx.args?.data ?? ctx.args
						: undefined;

				// Adjuntar __op solo para operaciones no estándar en métodos sin body
				const standardOps = new Set(["get", "getAll", "create", "update", "delete", "getByName"]);
				const includeParams = method === "GET" || method === "DELETE";
				const params = includeParams ? { ...(ctx.args || {}), ...(standardOps.has(ctx.op) ? {} : { __op: ctx.op }) } : undefined;

				console.debug(`[client-postRequest] [${method}]: ${url}`, body ?? params);

				const $fetch = (await import("ofetch")).$fetch;
				const res = await $fetch(url, {
					method,
					body,
					params,
					headers: {
						...(config?.headers || {}),
						"x-demo-auth": "true",
					},
				});

				console.debug("[client-postRequest] response:", res);

				// Normalizar respuesta
				const normalized =
					res && typeof res === "object" && Object.keys(res).length === 1 && (res as any).ok === true
						? ctx.state.validatedData ?? body ?? res
						: res;

				// Asegurar args y propagar resultado
				if (!ctx.args || typeof ctx.args !== "object") ctx.args = {} as any;
				(ctx.args as any).data = normalized;
				ctx.state.httpResponse = res;
				ctx.state.httpNormalizedData = normalized;
				ctx.done(normalized);
			} catch (e) {
				console.warn("[client-postRequest] error", e);
				throw e;
			}
		}
	};
}

// ======= MIDDLEWARE LOG REQUEST (HÍBRIDO) =======
// Para logging que funciona en ambos lados

export function createLogRequestMiddleware(config?: {
	logLevel?: "debug" | "info" | "warn" | "error";
	includeArgs?: boolean;
	includeState?: boolean;
}): HybridMiddleware {
	return async (ctx, next) => {
		const prefix = `[${ctx.stage}-logRequest]`;
		const logLevel = config?.logLevel || "debug";
		const includeArgs = config?.includeArgs ?? true;
		const includeState = config?.includeState ?? false;

		console[logLevel](`${prefix} ${ctx.model}.${ctx.op} - START`);

		if (includeArgs) {
			console[logLevel](`${prefix} Args:`, ctx.args);
		}

		if (includeState) {
			console[logLevel](`${prefix} State:`, ctx.state);
		}

		await next();

		console[logLevel](`${prefix} ${ctx.model}.${ctx.op} - END`);
	};
}

// ======= AUTO-REGISTRO =======
autoRegisterFromModule(
	{
		createPostRequestMiddleware,
		createLogRequestMiddleware,
	},
	"hybrid",
	"http-middlewares"
);
