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

interface CircuitState {
	failures: number;
	successes: number;
	state: "CLOSED" | "OPEN" | "HALF_OPEN";
	nextAttempt: number;
}

const circuitBreakerMap = new Map<string, CircuitState>();

export function createCircuitBreakerMiddleware(config: {
	failureThreshold: number;
	successThreshold: number;
	timeout: number;
	resetTimeout: number;
	fallback?: (ctx: any) => any;
}): HybridMiddleware {
	return async (ctx, next) => {
		const key = `${ctx.model}.${ctx.op}`;
		const state =
			circuitBreakerMap.get(key) || {
				failures: 0,
				successes: 0,
				state: "CLOSED",
				nextAttempt: 0,
			};
		circuitBreakerMap.set(key, state);

		if (state.state === "OPEN") {
			if (Date.now() > state.nextAttempt) {
				state.state = "HALF_OPEN";
			} else {
				if (config.fallback) {
					const result = await config.fallback(ctx);
					if (typeof result !== "undefined") {
						ctx.done(result);
					}
					return;
				}
				throw new Error("[circuit-breaker] circuit is open");
			}
		}

		try {
			await Promise.race([
				next(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("timeout")), config.timeout),
				),
			]);

			state.failures = 0;
			if (state.state === "HALF_OPEN") {
				state.successes++;
				if (state.successes >= config.successThreshold) {
					state.state = "CLOSED";
					state.successes = 0;
				}
			}
		} catch (err) {
			state.failures++;
			state.successes = 0;
			if (
				state.state === "HALF_OPEN" ||
				state.failures >= config.failureThreshold
			) {
				state.state = "OPEN";
				state.nextAttempt = Date.now() + config.resetTimeout;
			}
			throw err;
		}
	};
}

autoRegisterFromModule(
	{
		createThrottleMiddleware,
		createDebounceMiddleware,
		createRetryableMiddleware,
		createCacheableMiddleware,
		createCircuitBreakerMiddleware,
	},
	"hybrid",
	"control-middlewares"
);

