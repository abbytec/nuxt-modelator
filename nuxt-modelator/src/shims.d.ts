declare module "#nuxt-modelator/manifest" {
	const manifest: any;
	export default manifest;
}

declare module "#nuxt-modelator/runtime/middlewares" {
	export const clientMiddlewares: Record<string, any>;
	export const serverMiddlewares: Record<string, any>;
	export function registerClientMiddleware(name: string, factory: (config?: any) => any): void;
	export function registerServerMiddleware(name: string, factory: (config?: any) => any): void;
}

declare module "#nuxt-modelator/runtime/register-models.mjs" {
	export function ensureModelsRegistered(): Promise<void>;
}
