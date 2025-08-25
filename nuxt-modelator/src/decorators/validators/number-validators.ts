import "reflect-metadata";
import type { Validator } from "../../types.js";
import { decoratorRegistry } from "../decorator-registry.js";
import { createValidatorDecorator, createValidatorFactoryDecorator } from "../shared-helpers.js";

export function createMaxValidator(max: number): Validator {
	return {
		name: "max",
		stage: "isomorphic",
		defaultMessage: `El valor debe ser menor o igual a ${max}`,
		validate: ({ value }) => {
			if (typeof value !== "number") return true;
			return value <= max;
		},
	};
}

export function createMinValidator(min: number): Validator {
	return {
		name: "min",
		stage: "isomorphic",
		defaultMessage: `El valor debe ser mayor o igual a ${min}`,
		validate: ({ value }) => {
			if (typeof value !== "number") return true;
			return value >= min;
		},
	};
}

export function createRangeValidator({ min, max }: { min: number; max: number }): Validator {
	return {
		name: "range",
		stage: "isomorphic",
		defaultMessage: `El valor debe estar entre ${min} y ${max}`,
		validate: ({ value }) => {
			if (typeof value !== "number") return true;
			return value >= min && value <= max;
		},
	};
}

export const isPositiveValidator: Validator = {
	name: "isPositive",
	stage: "isomorphic",
	defaultMessage: "El valor debe ser positivo",
	validate: ({ value }) => {
		if (typeof value !== "number") return true;
		return value > 0;
	},
};

export const isNegativeValidator: Validator = {
	name: "isNegative",
	stage: "isomorphic",
	defaultMessage: "El valor debe ser negativo",
	validate: ({ value }) => {
		if (typeof value !== "number") return true;
		return value < 0;
	},
};

// ======= DECORADORES EXPORTADOS DIRECTAMENTE =======
export const Max = createValidatorFactoryDecorator("max", createMaxValidator);
export const Min = createValidatorFactoryDecorator("min", createMinValidator);
export const Range = createValidatorFactoryDecorator("range", createRangeValidator);
export const IsPositive = createValidatorDecorator(isPositiveValidator);
export const IsNegative = createValidatorDecorator(isNegativeValidator);

// ======= AUTO-REGISTRO =======
// Los validators se registran para uso en runtime
decoratorRegistry.registerValidatorFactory("max", createMaxValidator);
decoratorRegistry.registerValidatorFactory("min", createMinValidator);
decoratorRegistry.registerValidatorFactory("range", createRangeValidator);
decoratorRegistry.registerValidator(isPositiveValidator);
decoratorRegistry.registerValidator(isNegativeValidator);
