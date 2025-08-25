import type { HybridMiddleware } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";

// ======= MIDDLEWARE DE RATE LIMITING (HÍBRIDO) =======

// Cache simple para rate limiting
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

export function createRateLimitMiddleware(config: {
	maxRequests: number;
	windowMs: number;
	keyGenerator?: (ctx: any) => string;
	skipSuccessful?: boolean;
}): HybridMiddleware {
	return async (ctx, next) => {
		const keyGenerator =
			config.keyGenerator ||
			((ctx) => {
				// En servidor, usar IP si está disponible
				if (ctx.stage === "server" && ctx.event?.node?.req?.socket?.remoteAddress) {
					return `${ctx.event.node.req.socket.remoteAddress}:${ctx.model}.${ctx.op}`;
				}
				// En cliente, usar una clave basada en la operación
				return `client:${ctx.model}.${ctx.op}`;
			});

		const key = keyGenerator(ctx);
		const now = Date.now();
		const windowMs = config.windowMs;
		const maxRequests = config.maxRequests;

		// Obtener estado actual del rate limit
		let rateLimit = rateLimitCache.get(key);

		// Si no existe o la ventana ha expirado, reiniciar
		if (!rateLimit || now > rateLimit.resetTime) {
			rateLimit = {
				count: 0,
				resetTime: now + windowMs,
			};
		}

		// Incrementar contador
		rateLimit.count++;
		rateLimitCache.set(key, rateLimit);

		// Verificar si se excedió el límite
		if (rateLimit.count > maxRequests) {
			const resetIn = Math.ceil((rateLimit.resetTime - now) / 1000);
			console.warn(`[${ctx.stage}-ratelimit] Rate limit exceeded for key: ${key}`);
			return ctx.done({
				status: 429,
				code: "RATE_LIMIT_EXCEEDED",
				message: `Too many requests. Try again in ${resetIn} seconds.`,
				retryAfter: resetIn,
			});
		}

		console.debug(`[${ctx.stage}-ratelimit] Request ${rateLimit.count}/${maxRequests} for key: ${key}`);

		try {
			await next();

			// Si skipSuccessful es true y la request fue exitosa, decrementar el contador
			if (config.skipSuccessful && !ctx.state.__error) {
				rateLimit.count = Math.max(0, rateLimit.count - 1);
				rateLimitCache.set(key, rateLimit);
			}
		} catch (error) {
			// Marcar error en el state para el skipSuccessful logic
			ctx.state.__error = error;
			throw error;
		}
	};
}

// ======= MIDDLEWARE DE LOGGING AVANZADO (HÍBRIDO) =======

export function createDebugMiddleware(config?: {
	logState?: boolean;
	logArgs?: boolean;
	logTiming?: boolean;
	prefix?: string;
}): HybridMiddleware {
	return async (ctx, next) => {
		const prefix = config?.prefix || `[${ctx.stage}-debug]`;
		const logState = config?.logState ?? false;
		const logArgs = config?.logArgs ?? true;
		const logTiming = config?.logTiming ?? true;

		const start = logTiming ? performance.now() : 0;

		console.group(`${prefix} ${ctx.model}.${ctx.op} - START`);

		if (logArgs) {
			console.log(`${prefix} Args:`, ctx.args);
		}

		if (logState) {
			console.log(`${prefix} Initial State:`, ctx.state);
		}

		try {
			await next();

			if (logState) {
				console.log(`${prefix} Final State:`, ctx.state);
			}

			if (logTiming) {
				const elapsed = performance.now() - start;
				console.log(`${prefix} Execution time: ${elapsed.toFixed(2)}ms`);
			}

			console.groupEnd();
		} catch (error) {
			console.error(`${prefix} Error:`, error);
			console.groupEnd();
			throw error;
		}
	};
}

// ======= AUTO-REGISTRO =======
autoRegisterFromModule(
	{
		createRateLimitMiddleware,
		createDebugMiddleware,
	},
	"hybrid",
	"validation-middlewares"
);
