import { eventHandler, getQuery, readBody, setResponseStatus } from "h3";
import { getManifest } from "../registry.js";
import { executeHybridMiddlewares } from "../middlewares/hybrid-executor.js";
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
function parseRoute(url: string, method: string, modelMeta: any) {
        const pathParts = url.replace(/^\/api\//, "").split("/");
        if (pathParts[pathParts.length - 1]?.includes("?")) {
                pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].split("?")[0];
        }
        const m = method.toLowerCase();
        if (pathParts.length === 1) {
                const resource = pathParts[0];
                const isSingular = resource === modelMeta.resource;
                if (m === "post") return isSingular ? "create" : "createAll";
                if (m === "put" || m === "patch") return isSingular ? "update" : "updateAll";
                if (m === "delete") return isSingular ? "delete" : "deleteAll";
                return isSingular ? "get" : "getAll";
        } else if (pathParts.length === 2 && pathParts[1] === "by-name") {
                return "getByName";
        }
        return "get";
}

export default eventHandler(async (event) => {
        const url = event.node.req.url || "";
        const method = event.node.req.method || "GET";

        // Asegurar que los modelos estén disponibles
        await ensureModelsLoaded();

        // Determinar recurso de la ruta
        const pathParts = url.replace(/^\/api\//, "").split("/");
        let routeResource = pathParts[0];
        if (routeResource?.includes("?")) {
                routeResource = routeResource.split("?")[0];
        }

        // Obtener manifest del registry
        const man = getManifest();
        let modelMeta = (man.models as any[]).find((m: any) => m.resource === routeResource || m.plural === routeResource);
        if (!modelMeta) {
                return { error: true, message: `Model not found: ${routeResource}`, statusCode: 404 } as any;
        }

        const op = parseRoute(url, method, modelMeta);
        const model = modelMeta.resource;
        const specs = modelMeta.apiMethods[op] || [];
        const args = getQuery(event);
        const state: any = {};
        let returned = false;
        let payload: any;
        const done = (p: any) => {
                returned = true;
                payload = p;
        };

        // Validaciones básicas para operaciones que envían datos
        if (["create", "createAll", "update", "updateAll", "saveOrUpdate"].includes(op)) {
                try {
                        const body = await readBody(event);
                        if (body && typeof body === "object") {
                                state.validatedData = body;
                        }
                } catch {}
        }

        await executeHybridMiddlewares(specs as any, { event, op, model, args, state, done, stage: "server" });

        if (!returned) {
                const resolver = defaultReturn;
                payload = await resolver({ event, op, model, state });
        }

        const status = payload?.status && Number.isInteger(payload.status) ? payload.status : 200;
        if (status !== 200) setResponseStatus(event, status);
        return payload;
});
