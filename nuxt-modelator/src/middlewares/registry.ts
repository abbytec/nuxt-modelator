import type { ClientMiddleware, ServerMiddleware } from "../types.js";

export type ClientMiddlewareFactory = (config?: any) => ClientMiddleware;
export type ServerMiddlewareFactory = (config?: any) => ServerMiddleware;

const clientRegistry: Record<string, ClientMiddlewareFactory> = {};
const serverRegistry: Record<string, ServerMiddlewareFactory> = {};

export function registerClientMiddleware(name: string, factory: ClientMiddlewareFactory): void {
	clientRegistry[name] = factory;
}

export function registerServerMiddleware(name: string, factory: ServerMiddlewareFactory): void {
	serverRegistry[name] = factory;
}

// Exportar los registries para uso en auto-registry.ts
export { clientRegistry, serverRegistry };

// Elimino las exportaciones duplicadas para evitar conflictos
// Las exportaciones oficiales están en auto-registry.ts
