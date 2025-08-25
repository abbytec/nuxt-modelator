import type { ServerMiddleware, ServerMiddlewareFactory } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";

// ======= MIDDLEWARE DE AUTENTICACIÓN =======

export function createIsAuthMiddleware(): ServerMiddleware {
	return async (ctx, next) => {
		// Verificar autenticación antes de continuar
		const authHeader = ctx.event.node.req.headers.authorization;
		const demoAuth = ctx.event.node.req.headers["x-demo-auth"];

		if (!authHeader && !demoAuth) {
			return ctx.done({ status: 401, code: "UNAUTHORIZED", message: "Authentication required" });
		}

		// Añadir datos de usuario al state para próximos middlewares
		ctx.state.user = {
			id: "demo-user",
			authenticated: true,
			authMethod: authHeader ? "header" : "demo",
		};

		console.info(`[auth] User authenticated: ${ctx.state.user.id}`);

		// Continuar con el siguiente middleware
		await next();
	};
}

export function createSessionHasPropertyMiddleware(config: {
	roles?: { admin?: boolean; user?: boolean };
	permissions?: string[];
}): ServerMiddleware {
	return async (ctx, next) => {
		// Demo: header 'x-roles: admin,user'
		const roles = String(ctx.event.node.req.headers["x-roles"] || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		const permissions = String(ctx.event.node.req.headers["x-permissions"] || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		// Verificar roles requeridos
		if (config.roles?.admin && !roles.includes("admin")) {
			return ctx.done({ status: 403, code: "FORBIDDEN", message: "Admin role required" });
		}

		if (config.roles?.user && !roles.includes("user")) {
			return ctx.done({ status: 403, code: "FORBIDDEN", message: "User role required" });
		}

		// Verificar permisos requeridos
		if (config.permissions) {
			const hasAllPermissions = config.permissions.every((perm) => permissions.includes(perm));
			if (!hasAllPermissions) {
				return ctx.done({
					status: 403,
					code: "FORBIDDEN",
					message: `Missing required permissions: ${config.permissions.filter((p) => !permissions.includes(p)).join(", ")}`,
				});
			}
		}

		// Añadir información de autorización al state
		ctx.state.authorization = {
			roles,
			permissions,
			hasAdminRole: roles.includes("admin"),
			hasUserRole: roles.includes("user"),
		};

		console.info(`[auth] Authorization verified - roles: ${roles.join(",")}, permissions: ${permissions.join(",")}`);

		await next();
	};
}

// ======= MIDDLEWARE PARA MEDIR TIEMPO (EJEMPLO DE COMPOSICIÓN) =======

export function createTimedMiddleware(config: {
	label?: string;
	logResults?: boolean;
	threshold?: number; // Log solo si excede este tiempo en ms
}): ServerMiddleware {
	return async (ctx, next) => {
		const label = config.label || `${ctx.model}.${ctx.op}`;
		const logResults = config.logResults ?? true;
		const threshold = config.threshold ?? 0;

		const start = performance.now();

		if (logResults) {
			console.time(`[Timer] ${label}`);
		}

		// Ejecutar todos los middlewares siguientes
		try {
			await next();
		} finally {
			// Siempre medir el tiempo, incluso si hay errores
			const elapsed = performance.now() - start;

			// Guardar métricas en el state
			if (!ctx.state.__timing) {
				ctx.state.__timing = {};
			}
			ctx.state.__timing[label] = {
				label,
				elapsed,
				startTime: start,
				endTime: performance.now(),
			};

			// Log solo si excede el threshold o si logResults es true
			if (logResults && (threshold === 0 || elapsed > threshold)) {
				console.timeEnd(`[Timer] ${label}`);
				console.info(`[Timer] ${label} completed in ${elapsed.toFixed(2)}ms`);
			}
		}
	};
}

// ======= AUTO-REGISTRO =======
// Este módulo se auto-registra cuando se importa
autoRegisterFromModule(
	{
		createIsAuthMiddleware,
		createSessionHasPropertyMiddleware,
		createTimedMiddleware,
	},
	"server",
	"auth-middlewares"
);
