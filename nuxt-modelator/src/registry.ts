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
	return {
		models: Array.from(REGISTRY.models.values()),
		resolvers: {},
	};
}
