// ======= REDIRECCIÓN AL NUEVO SISTEMA DE COMPOSICIÓN =======
// Este archivo es mantenido por compatibilidad, pero redirige al nuevo sistema

import type { EnhancedMiddlewareSpec } from "../types.js";
import { executeMiddlewaresWithComposition } from "./composition-executor.js";

export async function executeHybridMiddlewares(
	specs: EnhancedMiddlewareSpec[],
	context: {
		event?: any;
		op: string;
		model: string;
		args: any;
		state: any;
		done: (payload: any) => void;
		stage: "server" | "client";
	}
) {
	// Redirigir al nuevo sistema de composición
	await executeMiddlewaresWithComposition(specs, context);
}
