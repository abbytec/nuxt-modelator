import type { ClientMiddlewareFactory, ServerMiddlewareFactory, HybridMiddlewareFactory } from "../types.js";
import {
        registerClientMiddleware as regClientMw,
        registerServerMiddleware as regServerMw,
        clientRegistry,
        serverRegistry,
} from "./registry.js";

// Registry para middlewares híbridos (único de auto-registry)
const hybridRegistry: Record<string, HybridMiddlewareFactory> = {};

// Importar registries de registry.ts (evitamos duplicación)
// Los registries base están en registry.ts, aquí solo manejamos híbridos y auto-registro

// ======= FUNCIONES DE REGISTRO MANUAL =======

export function registerClientMiddleware(name: string, factory: ClientMiddlewareFactory): void {
	regClientMw(name, factory);
	console.debug(`[auto-registry] Registered client middleware: ${name}`);
}

export function registerServerMiddleware(name: string, factory: ServerMiddlewareFactory): void {
	regServerMw(name, factory);
	console.debug(`[auto-registry] Registered server middleware: ${name}`);
}

export function registerHybridMiddleware(name: string, factory: HybridMiddlewareFactory): void {
	hybridRegistry[name] = factory;
	console.debug(`[auto-registry] Registered hybrid middleware: ${name}`);
}

// ======= FUNCIONES DE AUTO-REGISTRO =======

/**
 * Función helper para auto-registrar middlewares desde un módulo
 */
function registerFromModule(moduleExports: Record<string, any>, type: "client" | "server" | "hybrid") {
	for (const [key, value] of Object.entries(moduleExports)) {
		// Buscar factories de middleware (funciones que retornan middlewares)
		if (typeof value === "function") {
			// Extraer nombre del export (removeMiddleware, createAuthMiddleware, etc.)
			const middlewareName = extractMiddlewareName(key);
			if (middlewareName) {
				switch (type) {
					case "client":
						registerClientMiddleware(middlewareName, value);
						break;
					case "server":
						registerServerMiddleware(middlewareName, value);
						break;
					case "hybrid":
						registerHybridMiddleware(middlewareName, value);
						break;
				}
			}
		}

		// También registrar exports directos de middlewares (sin factory)
		if (key.endsWith("Middleware") && typeof value === "function") {
			const middlewareName = key.replace("Middleware", "").toLowerCase();
			const factory = () => value;

			switch (type) {
				case "client":
					registerClientMiddleware(middlewareName, factory);
					break;
				case "server":
					registerServerMiddleware(middlewareName, factory);
					break;
				case "hybrid":
					registerHybridMiddleware(middlewareName, factory);
					break;
			}
		}
	}
}

/**
 * Extrae el nombre del middleware desde el nombre del export
 */
function extractMiddlewareName(exportName: string): string | null {
	// Patrones: createXxxMiddleware, xxxMiddlewareFactory, xxxFactory, etc.
	const patterns = [/^create(.+)Middleware$/, /^(.+)MiddlewareFactory$/, /^(.+)Factory$/, /^create(.+)$/];

	for (const pattern of patterns) {
		const match = pattern.exec(exportName);
		if (match) {
			const name = match[1];
			// Convertir PascalCase a camelCase
			return name.charAt(0).toLowerCase() + name.slice(1);
		}
	}

	// Si no coincide con patrones, usar nombre directo en camelCase
	if (exportName.length > 0) {
		return exportName.charAt(0).toLowerCase() + exportName.slice(1);
	}

	return null;
}

// ======= AUTO-REGISTRO POR IMPORTACIÓN =======

/**
 * Los middlewares se auto-registrarán cuando se importen sus archivos.
 * Este sistema no usa auto-discovery dinámico, sino que cada archivo
 * debe importarse explícitamente para registrar sus middlewares.
 */
export function autoRegisterFromModule(moduleExports: Record<string, any>, type: "client" | "server" | "hybrid", moduleName?: string) {
	console.debug(`[auto-registry] Auto-registering ${type} middlewares from module: ${moduleName || "unknown"}`);
	registerFromModule(moduleExports, type);
}

/**
 * Helper para que los módulos se auto-registren al ser importados
 */
export function createAutoRegisterModule(type: "client" | "server" | "hybrid") {
	return function (moduleExports: Record<string, any>, moduleName?: string) {
		autoRegisterFromModule(moduleExports, type, moduleName);
	};
}

// ======= EXPORTS =======

export const clientMiddlewares = clientRegistry;
export const serverMiddlewares = serverRegistry;
export const hybridMiddlewares = hybridRegistry;

// Función para obtener todos los middlewares registrados (útil para debugging)
export function getAllRegisteredMiddlewares() {
        return {
                client: Object.keys(clientRegistry),
                server: Object.keys(serverRegistry),
                hybrid: Object.keys(hybridRegistry),
        };
}
// ======= CARGA PEREZOSA DE MIDDLEWARES BUILT-IN =======
// Cargamos y registramos los middlewares incluidos la primera vez que se
// solicita. Esto evita problemas de dependencias circulares y asegura su
// disponibilidad en tiempo de ejecución.
let builtinsLoaded: Promise<void> | null = null;

export async function ensureBuiltInMiddlewares(): Promise<void> {
        if (!builtinsLoaded) {
                builtinsLoaded = Promise.all([
                        import("./server/auth-middlewares.js"),
                        import("./server/db-middlewares.js"),
                        import("./server/mongo-middlewares.js"),
                        import("./client/data-middlewares.js"),
                        import("./hybrid/validation-middlewares.js"),
                        import("./hybrid/http-middlewares.js"),
                ]).then(() => void 0);
        }
        await builtinsLoaded;
}

// Los middlewares se registrarán automáticamente cuando se importen sus respectivos archivos
