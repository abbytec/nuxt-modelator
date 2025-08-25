import { eventHandler } from "h3";
import { getManifest } from "../registry.js";
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

export default eventHandler(async () => {
	await ensureModelsLoaded();
	const manifest = getManifest();
	return {
		title: "Nuxt Modelator Inspector",
		version: "1.0.0",
		timestamp: new Date().toISOString(),
		models: (manifest.models as any[]).map((m: any) => ({
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
			endpoints: [
				`GET ${m.basePath}/${m.resource}`,
				...(m.globalConfig.enableList !== false ? [`GET ${m.basePath}/${m.plural}`, `POST ${m.basePath}/${m.plural}`] : []),
				...(m.apiMethods.getByName ? [`GET ${m.basePath}/${m.plural}/by-name`] : []),
			],
		})),
		stats: {
			totalModels: (manifest.models as any[]).length,
			totalEndpoints: (manifest.models as any[]).reduce((acc: any, m: any) => {
				let count = 1; // GET singular
				if (m.globalConfig.enableList !== false) count += 2; // GET list + POST create
				if (m.apiMethods.getByName) count += 1; // GET by-name
				return acc + count;
			}, 0),
			totalProperties: (manifest.models as any[]).reduce((acc: any, m: any) => acc + m.props.length, 0),
		},
	};
});
