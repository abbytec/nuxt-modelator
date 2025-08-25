import { eventHandler, readBody, setResponseStatus } from "h3";
import { serverMiddlewares } from "../middlewares/auto-registry.js";
import { defaultReturn } from "../middlewares.server.js";
import { getManifest } from "../registry.js";
import { join } from "pathe";
import { decoratorRegistry } from "../decorators/decorator-registry.js";
import { executeHybridMiddlewares } from "../middlewares/hybrid-executor.js";
import type { EnhancedMiddlewareSpec } from "../types.js";

// Forzar carga/registro de todos los middlewares (server, client, hybrid) en runtime Nitro
import "../middlewares/index.js";

async function ensureModelsLoaded(): Promise<void> {
	const g = globalThis as any;
	if (g.__NUXT_MODELATOR_MODELS_LOADED__) return;
	try {
		const { createJiti } = await import("jiti");
		const fg = (await import("fast-glob")).default as any;
		const root = process.cwd();
		const modelsDir = process.env.NUXT_MODELATOR_MODELS_DIR || "domain/models";
		const pattern = join(root, modelsDir, "**/*.{ts,js,mts,cts}");
		const files: string[] = await fg(pattern, { absolute: true, dot: false });
		const jiti = createJiti(root, { interopDefault: true });
		for (const f of files) {
			try {
				await jiti.import(f);
			} catch (e) {
				console.warn("[modelator][runtime] Error importando modelo", f, (e as any)?.message || e);
			}
		}
		g.__NUXT_MODELATOR_MODELS_LOADED__ = true;
	} catch (e) {
		console.warn("[modelator][runtime] No se pudieron cargar modelos en runtime:", (e as any)?.message || e);
	}
}

// Sistema de validación usando el registry
async function validateField(value: any, field: string, target: any, transforms: any[]): Promise<any[]> {
	const validations = (transforms || [])
		.filter((t: any) => t.kind === "validate")
		.map((t: any) => ({ validator: t.validator, config: t.config || {} }));
	if (validations.length === 0) return [];
	const { errors } = await decoratorRegistry.applyValidations(value, field, target, "server", validations);
	return errors;
}

// Sistema de transformación usando el registry
async function transformField(value: any, field: string, target: any, transforms: any[]): Promise<any> {
	const txs = (transforms || [])
		.filter((t: any) => t.kind === "transform")
		.map((t: any) => ({ transformer: t.transformer, config: t.config || {} }));
	if (txs.length === 0) return value;
	return await decoratorRegistry.applyTransforms(value, field, target, "server", txs);
}

async function processModelValidation(data: any, modelMeta: any) {
	const transformedData = { ...data };
	const allErrors: any[] = [];
	for (const prop of modelMeta.props || []) {
		if (Object.hasOwn(data, prop.name)) {
			let value = data[prop.name];
			value = await transformField(value, prop.name, modelMeta.className, prop.transforms);
			transformedData[prop.name] = value;
			const validationErrors = await validateField(value, prop.name, modelMeta.className, prop.transforms);
			allErrors.push(...validationErrors);
		}
	}
	return { transformedData, isValid: allErrors.length === 0, errors: allErrors };
}

// Determinar operación de la URL
function parseRoute(url: string, method: string, modelMeta: any): string {
	const pathParts = url.replace(/^\/api\//, "").split("/");
	if (pathParts[pathParts.length - 1]?.includes("?")) {
		pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].split("?")[0];
	}
	const m = method.toLowerCase();
	if (pathParts.length === 1) {
		const resource = pathParts[0];
		if (m === "post") return "create";
		if (m === "put" || m === "patch") return "update";
		if (m === "delete") return "delete";
		return resource === modelMeta.resource ? "get" : "getAll";
	} else if (pathParts.length === 2 && pathParts[1] === "by-name") {
		return "getByName";
	}
	return "get";
}

function expandServerSpecs(specs: any[]): EnhancedMiddlewareSpec[] {
	const out: EnhancedMiddlewareSpec[] = [];
	for (const s of specs || []) {
		if (s && typeof s === "object" && s.name === "postRequest" && s.args?.middlewares) {
			out.push(...(s.args.middlewares as any[]));
		} else if (s && typeof s === "object" && s.name === "logRequest") {
			continue;
		} else {
			out.push(s as any);
		}
	}
	return out;
}

export default eventHandler(async (event) => {
	const url = event.node.req.url || "";
	const method = event.node.req.method || "GET";

	// Asegurar que los modelos y middlewares estén disponibles
	await ensureModelsLoaded();
	await import("../middlewares/index.js");

	// Obtener manifest dinámicamente del registry
	const manifest = getManifest();

	// Buscar el modelo que coincida con la URL
	const pathParts = url.replace(/^\/api\//, "").split("/");
	let routeResource = pathParts[0];
	if (pathParts[0]?.includes("?")) {
		routeResource = pathParts[0].split("?")[0];
	}
	const modelMeta = (manifest.models as any[]).find((m: any) => m.resource === routeResource || m.plural === routeResource);
	if (!modelMeta) {
		setResponseStatus(event, 404);
		return { error: true, code: "MODEL_NOT_FOUND", message: `Model not found: ${routeResource}` } as any;
	}

	let op = parseRoute(url, method, modelMeta);
	const model = modelMeta.resource;

	// Construir args desde querystring
	let args: Record<string, string> = {};
	try {
		const u = new URL(url, "http://localhost");
		args = Object.fromEntries(u.searchParams.entries());
	} catch {}

	// Permitir override de operación via __op
	if (args.__op) {
		op = String(args.__op);
		delete (args as any).__op;
	}

	const specsRaw = modelMeta.apiMethods[op] || [];
	const specs = expandServerSpecs(specsRaw);

	const state: any = { modelMeta };
	let returned = false;
	let payload: any;
	const done = (p: any) => {
		returned = true;
		payload = p;
	};

	// Validaciones de entrada para operaciones que reciben datos
	if (["create", "update"].includes(op)) {
		try {
			const body = await readBody(event);
			if (body) {
				const validation = await processModelValidation(body, modelMeta);
				if (!validation.isValid) {
					setResponseStatus(event, 400);
					return { code: "VALIDATION_ERROR", message: "Validation failed", validationErrors: validation.errors } as any;
				}
				state.validatedData = validation.transformedData;
			}
		} catch (e) {
			console.warn("Body validation error:", e);
		}
	}

	await executeHybridMiddlewares(specs as EnhancedMiddlewareSpec[], {
		event,
		op,
		model,
		args,
		state,
		done,
		stage: "server",
	});

	if (!returned) {
		const resolver = defaultReturn;
		payload = await resolver({ event, op, model, state });
	}

	const status = payload?.status && Number.isInteger(payload.status) ? payload.status : 200;
	if (status !== 200) setResponseStatus(event, status);
	return payload;
});
