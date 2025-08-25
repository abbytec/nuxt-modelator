import "reflect-metadata";
import type { ModelGlobalConfig, ModelApiMethods } from "./types.js";
import { registerModel } from "./registry.js";

// Auto-import de todos los decoradores para asegurar que se registren
import "./decorators/transformers/string-transformers.js";
import "./decorators/validators/index.js";
import "./decorators/mongodb/index.js";

// Solo mantener la nueva sintaxis separada
export function Model(config: ModelGlobalConfig, methods: ModelApiMethods): ClassDecorator {
	return (target: any) => {
		registerModel(target, config, methods);
	};
}

// ======= EXPORTACIONES TREE-SHAKING FRIENDLY =======

// Re-exportar transformers
export * from "./decorators/transformers/string-transformers.js";

// Re-exportar validators
export * from "./decorators/validators/generic-validators.js";
export * from "./decorators/validators/string-validators.js";
export * from "./decorators/validators/number-validators.js";
export * from "./decorators/validators/date-validators.js";
export * from "./decorators/mongodb/index.js";

// Export del registry para uso avanzado
export { decoratorRegistry } from "./decorators/decorator-registry.js";

// Export de tipos útiles
export type { DecoratorConfig, Validator, Transformer, ValidationResult, ValidationError } from "./types.js";
