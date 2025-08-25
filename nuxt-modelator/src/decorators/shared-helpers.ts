import "reflect-metadata";
import type { Validator, Transformer, DecoratorConfig } from "../types.js";
import { pushPropTransform } from "../registry.js";

/**
 * Helper para crear decoradores de transformers
 */
export function createTransformDecorator(transformer: Transformer) {
	return (config: DecoratorConfig = {}) => {
		return (target: any, propertyKey: string | symbol) => {
			pushPropTransform(target, propertyKey as string, {
				kind: "transform",
				transformer,
				config,
			});
		};
	};
}

/**
 * Helper para crear decoradores de validators simples
 */
export function createValidatorDecorator(validator: Validator) {
	return (config: DecoratorConfig = {}) => {
		return (target: any, propertyKey: string | symbol) => {
			pushPropTransform(target, propertyKey as string, {
				kind: "validate",
				validator,
				config,
			});
		};
	};
}

/**
 * Helper para crear decoradores de validator factories
 */
export function createValidatorFactoryDecorator(factoryName: string, factory: (args: any) => Validator) {
	return (...args: any[]) => {
		// El último argumento puede ser config
		let config: DecoratorConfig = {};
		let factoryArgs = args;

		const lastArg = args[args.length - 1];
		if (lastArg && typeof lastArg === "object" && !Array.isArray(lastArg)) {
			const hasConfigProps = "message" in lastArg || "stage" in lastArg;
			const factoryProps = Object.keys(lastArg).filter((key) => !["message", "stage"].includes(key));

			if (hasConfigProps && factoryProps.length === 0) {
				config = lastArg;
				factoryArgs = args.slice(0, -1);
			}
		}

		return (target: any, propertyKey: string | symbol) => {
			const factoryArgObj = factoryArgs.length === 1 ? factoryArgs[0] : factoryArgs;
			const validator = factory(factoryArgObj);

			pushPropTransform(target, propertyKey as string, {
				kind: "validate",
				validator,
				config: { ...config, args: factoryArgObj },
			});
		};
	};
}
