import type { HybridMiddleware } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";

export function createRunMiddleware(action?: ((ctx: any) => any) | Promise<any>): HybridMiddleware {
    return async (ctx, next) => {
        await next();
        if (!action) return;
        try {
            const result = typeof action === "function" ? action(ctx) : action;
            if (result && typeof (result as any).then === "function") {
                await result;
            }
        } catch (e) {
            console.warn(`[run] error executing action`, e);
            throw e;
        }
    };
}

autoRegisterFromModule({ createRunMiddleware }, "hybrid", "run-middlewares");
