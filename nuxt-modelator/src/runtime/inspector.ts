import { eventHandler } from "h3";
import { getManifest } from "../registry.js";
import { join } from "pathe";
import { clientMiddlewares, serverMiddlewares, hybridMiddlewares } from "../middlewares/auto-registry.js";

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

const requestMiddlewareNames = new Set([
        "postRequest",
        "postAllRequest",
        "getRequest",
        "getAllRequest",
        "putRequest",
        "putAllRequest",
        "deleteRequest",
        "deleteAllRequest",
]);

function getMiddlewareStage(name: string, args?: any): "server" | "client" | "hybrid" {
        if (serverMiddlewares[name]) return "server";
        if (clientMiddlewares[name]) return "client";
        if (hybridMiddlewares[name]) {
                if (requestMiddlewareNames.has(name) && args && typeof args === "object" && (args as any).url) {
                        return "client";
                }
                return "hybrid";
        }
        return "server";
}

function hasServerSpecs(opSpecs: any[]): boolean {
        const specs = Array.isArray(opSpecs) ? opSpecs : [];

        const hasExternalRequest = specs.some(
                (s) =>
                        typeof s === "object" &&
                        requestMiddlewareNames.has(s.name) &&
                        s.args &&
                        typeof s.args === "object" &&
                        (s.args as any).url
        );
        if (hasExternalRequest) return false;

        return specs.some((s: any) => {
                if (!s) return false;
                const name = typeof s === "string" ? s : s.name;
                const args = typeof s === "object" ? s.args : undefined;
                const stage = getMiddlewareStage(name, args);
                return stage === "server" || stage === "hybrid";
        });
}

export default eventHandler(async () => {
        await ensureModelsLoaded();
        await import("../middlewares/index.js");
        const manifest = getManifest();
        const models = (manifest.models as any[]).map((m: any) => {
                const endpoints: string[] = [];
                if (hasServerSpecs((m.apiMethods as any).get)) {
                        endpoints.push(`GET ${m.basePath}/${m.resource}`);
                }
                if (m.globalConfig.enableList !== false && hasServerSpecs((m.apiMethods as any).getAll)) {
                        endpoints.push(`GET ${m.basePath}/${m.plural}`);
                }
                if (hasServerSpecs((m.apiMethods as any).create)) {
                        endpoints.push(`POST ${m.basePath}/${m.resource}`);
                }
                if (m.globalConfig.enableList !== false && hasServerSpecs((m.apiMethods as any).createAll)) {
                        endpoints.push(`POST ${m.basePath}/${m.plural}`);
                }
                if (hasServerSpecs((m.apiMethods as any).update)) {
                        endpoints.push(`PUT ${m.basePath}/${m.resource}`);
                }
                if (m.globalConfig.enableList !== false && hasServerSpecs((m.apiMethods as any).updateAll)) {
                        endpoints.push(`PUT ${m.basePath}/${m.plural}`);
                }
                if (hasServerSpecs((m.apiMethods as any).delete)) {
                        endpoints.push(`DELETE ${m.basePath}/${m.resource}`);
                }
                if (m.globalConfig.enableList !== false && hasServerSpecs((m.apiMethods as any).deleteAll)) {
                        endpoints.push(`DELETE ${m.basePath}/${m.plural}`);
                }
                if (hasServerSpecs((m.apiMethods as any).getByName)) {
                        endpoints.push(`GET ${m.basePath}/${m.resource}/by-name`);
                        if (m.globalConfig.enableList !== false) {
                                endpoints.push(`GET ${m.basePath}/${m.plural}/by-name`);
                        }
                }

                return {
                        className: m.className,
                        resource: m.resource,
                        plural: m.plural,
                        basePath: m.basePath,
                        operations: Object.keys(m.apiMethods).filter((key) => Array.isArray(m.apiMethods[key]) && m.apiMethods[key].length > 0),
                        enableList: m.globalConfig.enableList,
                        customReturn: m.globalConfig.customReturn,
                        properties: m.props.map((prop: any) => ({
                                name: prop.name,
                                decorators: prop.transforms.map((t: any) => ({
                                        type: t.kind,
                                        name: t.kind === "transform" ? t.transformer.name : t.validator.name,
                                        config: t.config,
                                })),
                        })),
                        endpoints,
                        propsCount: m.props.length,
                };
        });

        return {
                title: "Nuxt Modelator Inspector",
                version: "1.0.0",
                timestamp: new Date().toISOString(),
                models: models.map(({ propsCount, ...rest }) => rest),
                stats: {
                        totalModels: models.length,
                        totalEndpoints: models.reduce((acc, m) => acc + m.endpoints.length, 0),
                        totalProperties: models.reduce((acc, m) => acc + (m as any).propsCount, 0),
                },
        };
});
