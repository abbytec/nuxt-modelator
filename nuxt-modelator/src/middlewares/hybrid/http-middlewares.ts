import type { HybridMiddleware } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";

// ======= FACTORÍA GENÉRICA PARA REQUESTS HÍBRIDOS =======
function buildRequestMiddleware(defaultMethod: string, usePlural: boolean) {
	return function (config?: {
		url?: string | ((ctx: any) => string);
		headers?: Record<string, string> | ((ctx: any) => Record<string, string>);
		method?: string;
		baseUrl?: string;
		middlewares?: any[]; // Middlewares que solo se ejecutan en servidor
		bodyMapper?: (data: any, ctx: any) => any | Promise<any>;
	}): HybridMiddleware {
		return async (ctx, next) => {
			const name = `${(config?.method || defaultMethod).toLowerCase()}${usePlural ? "All" : ""}Request`;

			if (ctx.stage === "server") {
				if (config?.middlewares && config.middlewares.length > 0) {
					console.log(`[server-${name}] Executing ${config.middlewares.length} nested middlewares for ${ctx.model}.${ctx.op}`);

					const { executeMiddlewaresWithComposition } = await import("../composition-executor.js");
					await executeMiddlewaresWithComposition(config.middlewares, ctx);
				}

				await next();
			} else {
				await next();

				try {
					const method = (config?.method || defaultMethod).toUpperCase();
					const plural: string = ctx.state.__plural || `${ctx.model}s`;
					const basePath: string = ctx.state.__basePath || config?.baseUrl || "/api";

					const url = config?.url
						? typeof config.url === "function"
							? config.url(ctx)
							: config.url
						: `${basePath}/${usePlural ? plural : ctx.model}`;

					const rawData = ctx.state.validatedData ?? ctx.args?.data ?? ctx.args;
					let body =
						method === "GET" || method === "DELETE"
							? undefined
							: config?.bodyMapper
							? await config.bodyMapper(rawData, ctx)
							: rawData;

					const standardOps = new Set([
						"get",
						"getAll",
						"create",
						"createAll",
						"update",
						"updateAll",
						"delete",
						"deleteAll",
						"getByName",
					]);
					let params = { ...(ctx.args || {}), ...(standardOps.has(ctx.op) ? {} : { __op: ctx.op }) };

					let headers = typeof config?.headers === "function" ? config.headers(ctx) : { ...(config?.headers || {}) };
					if (!config?.url) {
						headers = { "x-demo-auth": "true", ...headers };
					}

					console.debug(`[client-${name}] [${method}]: ${url}`, body ?? params);

					const $fetch = (await import("ofetch")).$fetch;
					const res = await $fetch(url, {
						method,
						body,
						params,
						headers,
					});

					console.debug(`[client-${name}] response:`, res);

					const normalized =
						res && typeof res === "object" && Object.keys(res).length === 1 && (res as any).ok === true
							? ctx.state.validatedData ?? body ?? res
							: res;

					if (!ctx.args || typeof ctx.args !== "object") ctx.args = {} as any;
					(ctx.args as any).data = normalized;
					ctx.state.httpResponse = res;
					ctx.state.httpNormalizedData = normalized;
					ctx.done(normalized);
				} catch (e) {
					console.warn(`[client-${name}] error`, e);
					throw e;
				}
			}
		};
	};
}

export const createPostRequestMiddleware = buildRequestMiddleware("POST", false);
export const createPostAllRequestMiddleware = buildRequestMiddleware("POST", true);
export const createGetRequestMiddleware = buildRequestMiddleware("GET", false);
export const createGetAllRequestMiddleware = buildRequestMiddleware("GET", true);
export const createPutRequestMiddleware = buildRequestMiddleware("PUT", false);
export const createPutAllRequestMiddleware = buildRequestMiddleware("PUT", true);
export const createDeleteRequestMiddleware = buildRequestMiddleware("DELETE", false);
export const createDeleteAllRequestMiddleware = buildRequestMiddleware("DELETE", true);

// ======= MIDDLEWARE LOG REQUEST (HÍBRIDO) =======
// Para logging que funciona en ambos lados

export function createLogRequestMiddleware(config?: {
	logLevel?: "debug" | "info" | "warn" | "error";
	includeArgs?: boolean;
	includeState?: boolean;
}): HybridMiddleware {
	return async (ctx, next) => {
		const prefix = `[${ctx.stage}-logRequest]`;
		const logLevel = config?.logLevel || "debug";
		const includeArgs = config?.includeArgs ?? true;
		const includeState = config?.includeState ?? false;

		console[logLevel](`${prefix} ${ctx.model}.${ctx.op} - START`);

		if (includeArgs) {
			console[logLevel](`${prefix} Args:`, ctx.args);
		}

		if (includeState) {
			console[logLevel](`${prefix} State:`, ctx.state);
		}

		await next();

		console[logLevel](`${prefix} ${ctx.model}.${ctx.op} - END`);
	};
}

// ======= AUTO-REGISTRO =======
autoRegisterFromModule(
	{
		createPostRequestMiddleware,
		createPostAllRequestMiddleware,
		createGetRequestMiddleware,
		createGetAllRequestMiddleware,
		createPutRequestMiddleware,
		createPutAllRequestMiddleware,
		createDeleteRequestMiddleware,
		createDeleteAllRequestMiddleware,
		createLogRequestMiddleware,
	},
	"hybrid",
	"http-middlewares"
);
