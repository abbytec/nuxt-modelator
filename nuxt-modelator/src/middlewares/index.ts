// Auto-importar todos los middlewares para registrarlos
import "./server/auth-middlewares.js";
import "./server/db-middlewares.js";
import "./server/mongo-middlewares.js";
import "./client/data-middlewares.js";
import "./hybrid/validation-middlewares.js";
import "./hybrid/http-middlewares.js";
import "./hybrid/run-middlewares.js";
import "./hybrid/control-middlewares.js";

// Exportar registries y funciones principales
export { clientMiddlewares, serverMiddlewares, hybridMiddlewares, getAllRegisteredMiddlewares } from "./auto-registry.js";

export { executeMiddlewaresWithComposition, createComposableMiddleware, composeMiddlewares } from "./composition-executor.js";

// Re-exportar tipos importantes
export type { ClientMiddleware, ServerMiddleware, HybridMiddleware, NextFunction, MiddlewareSpec, EnhancedMiddlewareSpec } from "../types.js";

// ======= HELPERS PARA CREAR MIDDLEWARES FÁCILMENTE =======

import type { MiddlewareSpec } from "../types.js";

// Helpers para middlewares de servidor
export const isAuth = (): MiddlewareSpec => ({ name: "isAuth", stage: "server" });
export const dbConnect = (config?: any): MiddlewareSpec => ({ name: "dbConnect", args: config, stage: "server" });
export const transaction = (config?: any): MiddlewareSpec => ({ name: "transaction", args: config, stage: "server" });
export const timed = (config?: any): MiddlewareSpec => ({ name: "timed", args: config, stage: "server" });
export const sessionHasProperty = (config: any): MiddlewareSpec => ({ name: "sessionHasProperty", args: config, stage: "server" });

// Helpers para middlewares de MongoDB
export const mongoQuery = (config?: any): MiddlewareSpec => ({ name: "mongoQuery", args: config, stage: "server" });
export const mongoSave = (config?: any): MiddlewareSpec => ({ name: "mongoSave", args: config, stage: "server" });
export const mongoUpdate = (config?: any): MiddlewareSpec => ({ name: "mongoUpdate", args: config, stage: "server" });
export const mongoDelete = (config?: any): MiddlewareSpec => ({ name: "mongoDelete", args: config, stage: "server" });
export const mongoSaveOrUpdate = (config?: any): MiddlewareSpec => ({ name: "mongoSaveOrUpdate", args: config, stage: "server" });
export const mongoInfo = (): MiddlewareSpec => ({ name: "mongoInfo", stage: "server" });

// Helpers para middlewares de cliente
export const saveOnStore = (config?: any): MiddlewareSpec => ({ name: "saveOnStore", args: config, stage: "client" });
export const populateArray = (config?: any): MiddlewareSpec => ({ name: "populateArray", args: config, stage: "client" });
export const getFromPluralFiltered = (filter: any): MiddlewareSpec => ({ name: "getFromPluralFiltered", args: filter, stage: "client" });
export const addToPlural = (config?: any): MiddlewareSpec => ({ name: "addToPlural", args: config, stage: "client" });
export const cache = (config?: any): MiddlewareSpec => ({ name: "cache", args: config, stage: "client" });

// Helpers para middlewares híbridos
export const run = (fn?: any): MiddlewareSpec => ({ name: "run", args: fn, stage: "isomorphic" });
export const rateLimit = (config: any): MiddlewareSpec => ({ name: "rateLimit", args: config, stage: "isomorphic" });
export const debug = (config?: any): MiddlewareSpec => ({ name: "debug", args: config, stage: "isomorphic" });
export const throttle = (wait: number, options?: any): MiddlewareSpec => ({ name: "throttle", args: { wait, ...(options || {}) }, stage: "isomorphic" });
export const debounce = (wait: number): MiddlewareSpec => ({ name: "debounce", args: wait, stage: "isomorphic" });
export const retryable = (retries: number): MiddlewareSpec => ({ name: "retryable", args: retries, stage: "isomorphic" });
export const cacheable = (config: any): MiddlewareSpec => ({ name: "cacheable", args: config, stage: "isomorphic" });

// ======= MIDDLEWARES HÍBRIDOS HTTP =======

/**
 * LogRequest híbrido - funciona en cliente y servidor
 */
export const logRequest = (config?: {
	logLevel?: "debug" | "info" | "warn" | "error";
	includeArgs?: boolean;
	includeState?: boolean;
}): MiddlewareSpec => ({ name: "logRequest", args: config, stage: "isomorphic" });

/**
 * PostRequest híbrido - soporte para middlewares anidados que solo se ejecutan en servidor
 *
 * @example
 * ```typescript
 * postRequest({
 *     middlewares: [logRequest(), dbConnect()], // Solo se ejecutan en servidor
 * })
 * ```
 */
type HttpRequestConfig = {
        url?: string | ((ctx: any) => string);
        headers?: Record<string, string>;
        method?: string;
        baseUrl?: string;
        middlewares?: MiddlewareSpec[]; // Middlewares que solo se ejecutan en servidor
        bodyMapper?: (data: any, ctx?: any) => any;
};

const reqStage = (config?: HttpRequestConfig) => (config?.url ? "client" : "isomorphic");

export const postRequest = (config?: HttpRequestConfig): MiddlewareSpec => ({ name: "postRequest", args: config, stage: reqStage(config) });
export const postAllRequest = (config?: HttpRequestConfig): MiddlewareSpec => ({ name: "postAllRequest", args: config, stage: reqStage(config) });
export const getRequest = (config?: HttpRequestConfig): MiddlewareSpec => ({ name: "getRequest", args: config, stage: reqStage(config) });
export const getAllRequest = (config?: HttpRequestConfig): MiddlewareSpec => ({ name: "getAllRequest", args: config, stage: reqStage(config) });
export const putRequest = (config?: HttpRequestConfig): MiddlewareSpec => ({ name: "putRequest", args: config, stage: reqStage(config) });
export const putAllRequest = (config?: HttpRequestConfig): MiddlewareSpec => ({ name: "putAllRequest", args: config, stage: reqStage(config) });
export const deleteRequest = (config?: HttpRequestConfig): MiddlewareSpec => ({ name: "deleteRequest", args: config, stage: reqStage(config) });
export const deleteAllRequest = (config?: HttpRequestConfig): MiddlewareSpec => ({ name: "deleteAllRequest", args: config, stage: reqStage(config) });

// ======= HELPER PARA COMPOSICIÓN FÁCIL =======

/**
 * Helper para crear una cadena de middlewares con timing automático
 */
export function timedBlock(label: string, middlewares: MiddlewareSpec[]): MiddlewareSpec[] {
	return [timed({ label, logResults: true }), ...middlewares];
}

/**
 * Helper para crear un bloque de validación completo
 * NOTA: Los middlewares específicos de validación fueron removidos.
 * Este helper está disponible para uso futuro cuando se agreguen nuevos middlewares.
 */
export function validationBlock(config: { required?: string[]; optional?: string[]; sanitize?: any; transform?: any }): MiddlewareSpec[] {
	console.warn("[validationBlock] Validation middlewares were removed. This function returns an empty array.");
	return [];
}

/**
 * Helper para crear un bloque de autenticación y autorización
 */
export function authBlock(config?: { roles?: { admin?: boolean; user?: boolean }; permissions?: string[] }): MiddlewareSpec[] {
	const middlewares: MiddlewareSpec[] = [isAuth()];

	if (config?.roles || config?.permissions) {
		middlewares.push(sessionHasProperty(config));
	}

	return middlewares;
}

/**
 * Helper para crear un bloque completo de base de datos
 */
export function dbBlock(config?: { useTransaction?: boolean; logQueries?: boolean; connectionConfig?: any }): MiddlewareSpec[] {
	const middlewares: MiddlewareSpec[] = [dbConnect(config?.connectionConfig)];

	// logQueries functionality was removed with queryLogger middleware

	if (config?.useTransaction) {
		middlewares.push(transaction());
	}

	return middlewares;
}

/**
 * Helper para crear un bloque completo de operaciones MongoDB
 */
export function mongoBlock(config: {
	operation: "query" | "save" | "update" | "delete" | "saveOrUpdate";
	filter?: any;
	options?: any;
	includeInfo?: boolean;
}): MiddlewareSpec[] {
	const middlewares: MiddlewareSpec[] = [
		dbConnect(), // Establece la conexión (detecta automáticamente MongoDB)
	];

	if (config.includeInfo) {
		middlewares.push(mongoInfo());
	}

	// Agregar el middleware específico de la operación
	switch (config.operation) {
		case "query":
			middlewares.push(mongoQuery({ filter: config.filter, options: config.options }));
			break;
		case "save":
			middlewares.push(mongoSave({ filter: config.filter, ...config.options }));
			break;
		case "update":
			middlewares.push(mongoUpdate({ filter: config.filter, ...config.options }));
			break;
		case "delete":
			middlewares.push(mongoDelete({ filter: config.filter, ...config.options }));
			break;
		case "saveOrUpdate":
			middlewares.push(mongoSaveOrUpdate({ filter: config.filter, ...config.options }));
			break;
	}

	return middlewares;
}

/**
 * Helper para operaciones CRUD completas de MongoDB
 */
export function mongoCrudBlock(operation: "create" | "read" | "update" | "delete", options?: any): MiddlewareSpec[] {
	switch (operation) {
		case "create":
			return mongoBlock({ operation: "save", ...options });
		case "read":
			return mongoBlock({ operation: "query", ...options });
		case "update":
			return mongoBlock({ operation: "update", ...options });
		case "delete":
			return mongoBlock({ operation: "delete", ...options });
		default:
			return [dbConnect()];
	}
}
