import type { HybridMiddleware, NextFunction, MiddlewareSpec } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";

// ======= THROTTLE =======
const throttleMap = new Map<string, number>();

export function createThrottleMiddleware(config: { wait: number; defaultValue?: any }): HybridMiddleware {
        return async (ctx, next) => {
                const key = `${ctx.model}.${ctx.op}`;
                const now = Date.now();
                const last = throttleMap.get(key) || 0;

                if (now - last < config.wait) {
                        if ("defaultValue" in config) {
                                ctx.done(config.defaultValue);
                                return;
                        }
                        throw new Error("[throttle] invoked too frequently");
                }

                throttleMap.set(key, now);
                await next();
        };
}

// ======= DEBOUNCE =======
interface DebounceEntry {
        timer: ReturnType<typeof setTimeout>;
        next: NextFunction;
        resolves: Array<() => void>;
        ctx: any;
}

const debounceMap = new Map<string, DebounceEntry>();

export function createDebounceMiddleware(wait: number): HybridMiddleware {
        return async (ctx, next) => {
                const key = `${ctx.model}.${ctx.op}`;
                return await new Promise<void>((resolve) => {
                        const existing = debounceMap.get(key);
                        const schedule = () => {
                                const entry = debounceMap.get(key)!;
                                entry.timer = setTimeout(async () => {
                                        debounceMap.delete(key);
                                        await entry.next();
                                        entry.resolves.forEach((r) => r());
                                }, wait);
                        };

                        if (existing) {
                                existing.resolves.push(resolve);
                                existing.ctx.args = ctx.args;
                                existing.next = next;
                                clearTimeout(existing.timer);
                                schedule();
                        } else {
                                const entry: DebounceEntry = {
                                        timer: setTimeout(async () => {
                                                debounceMap.delete(key);
                                                await entry.next();
                                                entry.resolves.forEach((r) => r());
                                        }, wait),
                                        next,
                                        resolves: [resolve],
                                        ctx,
                                };
                                debounceMap.set(key, entry);
                        }
                });
        };
}

// ======= RETRYABLE =======
export function createRetryableMiddleware(retries: number = 3): HybridMiddleware {
        return async (ctx, next) => {
                let attempt = 0;
                while (true) {
                        try {
                                await next();
                                return;
                        } catch (err) {
                                attempt++;
                                if (attempt > retries) {
                                        throw err;
                                }
                        }
                }
        };
}

// ======= CACHEABLE =======
interface CacheEntry {
        value: any;
        expires: number;
}

const cacheStore = new Map<string, CacheEntry>();

export function createCacheableMiddleware(config: { ttl: number; middlewares?: MiddlewareSpec[] }): HybridMiddleware {
        return async (ctx, next) => {
                const key = `${ctx.model}.${ctx.op}:${JSON.stringify(ctx.args)}`;
                const cached = cacheStore.get(key);
                const now = Date.now();

                if (cached && cached.expires > now) {
                        ctx.done(cached.value);
                        return;
                }

                const originalDone = ctx.done;
                let result: any;
                ctx.done = (payload: any) => {
                        result = payload;
                        originalDone(payload);
                };

                if (config.middlewares && config.middlewares.length > 0) {
                        const { executeMiddlewaresWithComposition } = await import("../composition-executor.js");
                        await executeMiddlewaresWithComposition(config.middlewares, ctx);
                } else {
                        await next();
                }

                cacheStore.set(key, { value: result, expires: now + (config.ttl || 0) });
        };
}

autoRegisterFromModule(
        {
                createThrottleMiddleware,
                createDebounceMiddleware,
                createRetryableMiddleware,
                createCacheableMiddleware,
        },
        "hybrid",
        "control-middlewares"
);

