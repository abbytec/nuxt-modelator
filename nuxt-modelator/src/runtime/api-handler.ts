import { eventHandler, getQuery, readBody, setResponseStatus } from "h3";
import { getManifest } from "../registry.js";
import { serverMiddlewares } from "../middlewares/auto-registry.js";
import { defaultReturn } from "../middlewares.server.js";
import { join } from "pathe";

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

// Determinar operación de la URL
function parseRoute(url: string, method: string) {
	const pathParts = url.replace(/^\/api\//, "").split("/");
	if (pathParts[pathParts.length - 1]?.includes("?")) {
		pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].split("?")[0];
	}
	if (pathParts.length === 1) {
		const resource = pathParts[0];
		if (method.toLowerCase() === "post") {
			return { model: resource, op: "create" };
		} else {
			return { model: resource, op: "getAll" };
		}
	} else if (pathParts.length === 2 && pathParts[1] === "by-name") {
		return { model: pathParts[0], op: "getByName" };
	}
	return { model: pathParts[0], op: "get" };
}

export default eventHandler(async (event) => {
	const url = event.node.req.url || "";
	const method = event.node.req.method || "GET";

	// Parsear la ruta para determinar modelo y operación
	let { model: routeModel, op } = parseRoute(url, method);

	// Asegurar que los modelos estén disponibles
	await ensureModelsLoaded();

	// Obtener manifest del registry
	const man = getManifest();
	let modelMeta = (man.models as any[]).find((m: any) => m.resource === routeModel || m.plural === routeModel);
	if (!modelMeta) {
		return { error: true, message: `Model not found: ${routeModel}`, statusCode: 404 } as any;
	}

	const model = modelMeta.resource;
	const specs = modelMeta.apiMethods[op] || [];
	const state: any = {};
	let returned = false;
	let payload: any;
	const done = (p: any) => {
		returned = true;
		payload = p;
	};

	// Validaciones básicas para create
	if (op === "create") {
		try {
			const body = await readBody(event);
			if (body && typeof body === "object") {
				state.validatedData = body;
			}
		} catch {}
	}

	for (const spec of specs) {
		const name = typeof spec === "string" ? spec : spec.name;
		const args = typeof spec === "string" ? undefined : spec.args;
		const stage = typeof spec === "string" ? "server" : spec.stage ?? "server";
		if (stage !== "server") continue;
		const factory = (serverMiddlewares as any)[name];
		if (!factory) throw new Error(`Unknown server middleware: ${name}`);
		await factory(args)({ event, op, model, args, state, done });
		if (returned) break;
	}

	if (!returned) {
		const resolver = defaultReturn;
		payload = await resolver({ event, op, model, state });
	}

	const status = payload?.status && Number.isInteger(payload.status) ? payload.status : 200;
	if (status !== 200) setResponseStatus(event, status);
	return payload;
});
