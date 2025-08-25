// ======= SISTEMA DE MIDDLEWARES CON COMPOSICIÓN Y AUTO-REGISTRO =======
// Auto-importar e inicializar todos los middlewares
import "./middlewares/index.js";

// Re-exportar todo automáticamente desde el sistema de middlewares
export * from "./middlewares/index.js";

// Mostrar middlewares registrados en modo debug
if (process.env.NODE_ENV === "development") {
	import("./middlewares/index.js").then((middlewares) => {
		const registered = middlewares.getAllRegisteredMiddlewares();
		console.debug("[nuxt-modelator] Registered middlewares:", registered);
	});
}
