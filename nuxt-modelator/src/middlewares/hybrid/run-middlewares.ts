import type { HybridMiddleware } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";

interface RunConfig {
	fn?: ((ctx: any) => any) | Promise<any>;
	after?: boolean;
}

export function createRunMiddleware(config?: RunConfig | ((ctx: any) => any) | Promise<any>): HybridMiddleware {
	let fn: ((ctx: any) => any) | Promise<any> | undefined;
	let after = false;

	if (typeof config === "function" || (config && typeof (config as any).then === "function")) {
		fn = config as any;
	} else if (config && typeof config === "object") {
		fn = (config as RunConfig).fn;
		after = !!(config as RunConfig).after;
	}

	const exec = async (ctx: any) => {
		if (!fn) return;
		try {
			const result = typeof fn === "function" ? fn(ctx) : fn;
			if (result && typeof (result as any).then === "function") {
				await result;
			}
		} catch (e) {
			console.warn(`[${ctx.stage}-run] error executing action`, e);
			throw e;
		}
	};

	return async (ctx, next) => {
		if (!after) {
			await exec(ctx);
		}
		await next();
		if (after) {
			await exec(ctx);
		}
	};
}

autoRegisterFromModule({ createRunMiddleware }, "hybrid", "run-middlewares");
