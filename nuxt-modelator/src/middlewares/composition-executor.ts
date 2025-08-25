import type {
	HybridMiddlewareSpec,
	EnhancedMiddlewareSpec,
	MiddlewareSpec,
	ClientMiddleware,
	ServerMiddleware,
	HybridMiddleware,
	NextFunction,
} from "../types.js";
import { clientMiddlewares, serverMiddlewares, hybridMiddlewares, ensureBuiltInMiddlewares } from "./auto-registry.js";

// ======= INTERFACES PARA CONTEXTO UNIFICADO =======

interface UnifiedContext {
	event?: any;
	op: string;
	model: string;
	args: any;
	state: any;
	done: (payload: any) => void;
	stage: "server" | "client";
}

// ======= EXECUTOR PRINCIPAL CON COMPOSICIÓN =======

export async function executeMiddlewaresWithComposition(specs: EnhancedMiddlewareSpec[], context: UnifiedContext) {
	// Crear la cadena de middlewares usando composición
	const middlewareChain = await buildMiddlewareChain(specs, context);

	// Ejecutar toda la cadena
	try {
		await middlewareChain();
		console.debug(`[composition-executor] All middlewares completed successfully for ${context.model}.${context.op}`);
	} catch (error) {
		console.error(`[composition-executor] Error in middleware chain for ${context.model}.${context.op}:`, error);
		throw error;
	}
}

// ======= CONSTRUCCIÓN DE LA CADENA DE COMPOSICIÓN =======

async function buildMiddlewareChain(specs: EnhancedMiddlewareSpec[], context: UnifiedContext): Promise<() => Promise<void>> {
	const middlewares = await resolveMiddlewares(specs, context);

	// Construir la cadena usando composición recursiva
	return middlewares.reduceRight<() => Promise<void>>(
		(next, middleware) => {
			return async () => {
				await middleware(context, next);
			};
		},
		// Función final que se ejecuta cuando todos los middlewares han llamado next()
		async () => {
			console.debug(`[composition-executor] Reached end of middleware chain for ${context.model}.${context.op}`);
		}
	);
}

// ======= RESOLUCIÓN DE MIDDLEWARES =======

async function resolveMiddlewares(
	specs: EnhancedMiddlewareSpec[],
	context: UnifiedContext
): Promise<Array<(ctx: UnifiedContext, next: NextFunction) => Promise<void>>> {
	// Ensure built-in middlewares are registered before resolving
	await ensureBuiltInMiddlewares();

	const resolvedMiddlewares: Array<(ctx: UnifiedContext, next: NextFunction) => Promise<void>> = [];

	for (const spec of specs) {
		if (typeof spec === "string") {
			// Middleware simple por nombre
			const middleware = await resolveSimpleMiddleware(spec, context);
			if (middleware) {
				resolvedMiddlewares.push(middleware);
			}
		} else if ("middlewares" in spec && spec.middlewares) {
			// Middleware híbrido con middlewares anidados
			const middleware = await resolveHybridMiddleware(spec, context);
			if (middleware) {
				resolvedMiddlewares.push(middleware);
			}
		} else {
			// Middleware normal con configuración
			const middleware = await resolveConfiguredMiddleware(spec as MiddlewareSpec, context);
			if (middleware) {
				resolvedMiddlewares.push(middleware);
			}
		}
	}

	return resolvedMiddlewares;
}

// ======= RESOLUCIÓN POR TIPO DE MIDDLEWARE =======

async function resolveSimpleMiddleware(
	name: string,
	context: UnifiedContext
): Promise<((ctx: UnifiedContext, next: NextFunction) => Promise<void>) | null> {
	// Intentar primero middlewares híbridos
	const hybridFactory = hybridMiddlewares[name];
	if (hybridFactory) {
		const hybridMiddleware = hybridFactory();
		return adaptHybridMiddleware(hybridMiddleware, context.stage);
	}

	// Luego específicos por stage
	if (context.stage === "server") {
		const serverFactory = serverMiddlewares[name];
		if (serverFactory) {
			const serverMiddleware = serverFactory();
			return adaptServerMiddleware(serverMiddleware);
		}
	} else {
		const clientFactory = clientMiddlewares[name];
		if (clientFactory) {
			const clientMiddleware = clientFactory();
			return adaptClientMiddleware(clientMiddleware);
		}
	}

	console.warn(`[composition-executor] Middleware '${name}' not found for stage '${context.stage}'`);
	return null;
}

async function resolveConfiguredMiddleware(
        spec: MiddlewareSpec,
        context: UnifiedContext
): Promise<((ctx: UnifiedContext, next: NextFunction) => Promise<void>) | null> {
        if (typeof spec === "string") {
                return resolveSimpleMiddleware(spec, context);
        }
        const { name, args } = spec;

        // Intentar híbridos primero
        const hybridFactory = hybridMiddlewares[name];
        if (hybridFactory) {
                const hybridMiddleware = hybridFactory(args);
                return adaptHybridMiddleware(hybridMiddleware, context.stage);
        }

        // Específicos por stage
        if (context.stage === "server") {
                const serverFactory = serverMiddlewares[name];
		if (serverFactory) {
			const serverMiddleware = serverFactory(args);
			return adaptServerMiddleware(serverMiddleware);
		}
	} else {
		const clientFactory = clientMiddlewares[name];
		if (clientFactory) {
			const clientMiddleware = clientFactory(args);
			return adaptClientMiddleware(clientMiddleware);
		}
	}

        console.warn(`[composition-executor] Configured middleware '${name}' not found for stage '${context.stage}'`);
        return null;
}

async function resolveHybridMiddleware(
        spec: HybridMiddlewareSpec,
        context: UnifiedContext
): Promise<((ctx: UnifiedContext, next: NextFunction) => Promise<void>) | null> {
        // Crear middleware que ejecuta anidados Y el principal
        return async (ctx: UnifiedContext, next: NextFunction) => {
                // Ejecutar middlewares anidados primero (solo en servidor por seguridad)
                if (context.stage === "server" && spec.middlewares && spec.middlewares.length > 0) {
                        console.log(`[composition-executor] Executing ${spec.middlewares.length} nested middlewares for ${spec.name}`);
                        await executeMiddlewaresWithComposition(spec.middlewares, context);
                }

		// Luego ejecutar el middleware principal
		const mainMiddleware = await resolveConfiguredMiddleware({ name: spec.name, args: spec.args }, context);

		if (mainMiddleware) {
			await mainMiddleware(ctx, next);
		} else {
			await next();
		}
	};
}

// ======= ADAPTADORES PARA COMPATIBILIDAD =======

function adaptServerMiddleware(serverMiddleware: ServerMiddleware): (ctx: UnifiedContext, next: NextFunction) => Promise<void> {
	return async (ctx: UnifiedContext, next: NextFunction) => {
		if (!ctx.event) {
			throw new Error("Server middleware requires event context");
		}

		const serverCtx = {
			event: ctx.event,
			op: ctx.op,
			model: ctx.model,
			args: ctx.args,
			state: ctx.state,
			done: ctx.done,
		};

		await serverMiddleware(serverCtx, next);
	};
}

function adaptClientMiddleware(clientMiddleware: ClientMiddleware): (ctx: UnifiedContext, next: NextFunction) => Promise<void> {
	return async (ctx: UnifiedContext, next: NextFunction) => {
		const clientCtx = {
			op: ctx.op,
			model: ctx.model,
			args: ctx.args,
			state: ctx.state,
			done: ctx.done,
		};

		await clientMiddleware(clientCtx, next);
	};
}

function adaptHybridMiddleware(
	hybridMiddleware: HybridMiddleware,
	stage: "server" | "client"
): (ctx: UnifiedContext, next: NextFunction) => Promise<void> {
	return async (ctx: UnifiedContext, next: NextFunction) => {
		const hybridCtx = {
			event: ctx.event, // Puede ser undefined en cliente
			op: ctx.op,
			model: ctx.model,
			args: ctx.args,
			state: ctx.state,
			done: ctx.done,
			stage: stage,
		};

		await hybridMiddleware(hybridCtx, next);
	};
}

// ======= FUNCIONES DE UTILIDAD =======

export function createComposableMiddleware<T>(middlewareFunction: (config: T) => (ctx: any, next: NextFunction) => Promise<void>) {
	return middlewareFunction;
}

export function composeMiddlewares(
	...middlewares: Array<(ctx: any, next: NextFunction) => Promise<void>>
): (ctx: any, next: NextFunction) => Promise<void> {
	return async (ctx: any, next: NextFunction) => {
		let index = -1;

		async function dispatch(i: number): Promise<void> {
			if (i <= index) {
				throw new Error("next() called multiple times");
			}
			index = i;

			const middleware = middlewares[i];
			if (!middleware) {
				return next();
			}

			await middleware(ctx, () => dispatch(i + 1));
		}

		await dispatch(0);
	};
}
