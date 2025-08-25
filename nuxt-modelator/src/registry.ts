import type { ModelMeta, ModelGlobalConfig, ModelApiMethods, PropertyMeta, PropTransform, Manifest } from "./types.js";
import pluralize from "pluralize";
import { camelCase } from "change-case";

// Usar un singleton global para evitar múltiples instancias del registro
const g = globalThis as any;
if (!g.__NUXT_MODELATOR_REGISTRY__) {
	g.__NUXT_MODELATOR_REGISTRY__ = {
		models: new Map<Function, ModelMeta>(),
		propBuffers: new Map<Function, Map<string, PropTransform[]>>(),
	};
}

const REGISTRY: {
	models: Map<Function, ModelMeta>;
	propBuffers: Map<Function, Map<string, PropTransform[]>>;
} = g.__NUXT_MODELATOR_REGISTRY__;

export function registerModel(target: Function, globalConfig: ModelGlobalConfig, apiMethods: ModelApiMethods) {
	const className = target.name;
	const resource = camelCase(className); // Libro -> 'libro'
	const plural = globalConfig.plural || pluralize(resource);
	const basePath = globalConfig.basePath || "/api";
	// recoger transforms en buffer por clase
	const propMap = REGISTRY.propBuffers.get(target) || new Map<string, PropTransform[]>();
	const props: PropertyMeta[] = Array.from(propMap.entries()).map(([name, transforms]) => ({ name, transforms }));
	const meta: ModelMeta = { className, resource, plural, basePath, globalConfig, apiMethods, props };
	REGISTRY.models.set(target, meta);
	try {
		console.info(`[modelator][registry] registered model`, meta);
	} catch {}
}

export function pushPropTransform(target: any, prop: string, t: PropTransform) {
	const ctor = target.constructor;
	if (!REGISTRY.propBuffers.has(ctor)) REGISTRY.propBuffers.set(ctor, new Map());
	const map = REGISTRY.propBuffers.get(ctor)!;
	if (!map.has(prop)) map.set(prop, []);
	map.get(prop)!.push(t);
}

export function getManifest(): Manifest {
	// Crear una copia serializable que preserve funciones como strings en __fn
	const models = Array.from(REGISTRY.models.values()).map((m) => {
		// Copiar props tal cual
		const props = Array.isArray(m.props) ? m.props.map((p) => ({ ...p })) : [];

		// Serializar apiMethods
		const apiMethods: any = {};
		const srcMethods: any = (m as any).apiMethods || {};
		for (const [op, specs] of Object.entries(srcMethods)) {
			const arr = Array.isArray(specs) ? specs : [];
			apiMethods[op] = arr.map((s: any) => {
				if (typeof s === "string") return s;
				if (!s || typeof s !== "object") return s;
				const out: any = { ...s };
				if (out.args && typeof out.args === "object") {
					out.args = { ...out.args };
					// Si hay una función en args.fn, agregar __fn serializable
					if (typeof out.args.fn === "function") {
						try {
							out.args.__fn = out.args.fn.toString();
						} catch {}
					}
				}
				// No tocar middlewares anidados aquí
				return out;
			});
		}

		return {
			className: m.className,
			resource: m.resource,
			plural: m.plural,
			basePath: m.basePath,
			globalConfig: m.globalConfig,
			apiMethods,
			props,
		} as any;
	});

	return {
		models,
		resolvers: {},
	};
}
