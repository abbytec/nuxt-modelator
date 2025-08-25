import "reflect-metadata";
import type { Validator } from "../../types.js";
import { decoratorRegistry } from "../decorator-registry.js";
import { createValidatorDecorator, createValidatorFactoryDecorator } from "../shared-helpers.js";

export function createMaxLengthValidator(maxLength: number): Validator {
	return {
		name: "maxLength",
		stage: "isomorphic",
		defaultMessage: `Value exceeds maximum length of ${maxLength}`,
		validate: ({ value }) => {
			if (typeof value === "string" || Array.isArray(value)) {
				return value.length <= maxLength;
			}
			if (value != null && typeof value === "object" && "length" in value && typeof value.length === "number") {
				return value.length <= maxLength;
			}
			return true;
		},
	};
}

export function createMinLengthValidator(minLength: number): Validator {
	return {
		name: "minLength",
		stage: "isomorphic",
		defaultMessage: `Value is below minimum length of ${minLength}`,
		validate: ({ value }) => {
			if (typeof value === "string" || Array.isArray(value)) {
				return value.length >= minLength;
			}
			if (value != null && typeof value === "object" && "length" in value && typeof value.length === "number") {
				return value.length >= minLength;
			}
			return true;
		},
	};
}

export function createLengthValidator({ min, max }: { min?: number; max?: number }): Validator {
	return {
		name: "length",
		stage: "isomorphic",
		defaultMessage: `Value length must be ${min ? `at least ${min}` : ""}${min && max ? " and " : ""}${max ? `at most ${max}` : ""}`,
		validate: ({ value }) => {
			if (typeof value === "string" || Array.isArray(value)) {
				const length = value.length;
				const minValid = min !== undefined ? length >= min : true;
				const maxValid = max !== undefined ? length <= max : true;
				return minValid && maxValid;
			}
			if (value != null && typeof value === "object" && "length" in value && typeof value.length === "number") {
				const length = value.length;
				const minValid = min !== undefined ? length >= min : true;
				const maxValid = max !== undefined ? length <= max : true;
				return minValid && maxValid;
			}
			return true;
		},
	};
}

export const requiredValidator: Validator = {
	name: "required",
	stage: "isomorphic",
	defaultMessage: "El valor es requerido",
	validate: ({ value }) => {
		if (value === null || value === undefined) return false;
		if (typeof value === "string") return value.trim().length > 0;
		if (typeof value === "number") return !Number.isNaN(value);
		if (typeof value === "boolean") return true;
		if (Array.isArray(value)) return value.length > 0;
		if (typeof value === "object") return Object.keys(value).length > 0;
		return true;
	},
};

export const notEmptyValidator: Validator = {
	name: "notEmpty",
	stage: "isomorphic",
	defaultMessage: "Value cannot be empty",
	validate: ({ value }) => {
		if (typeof value === "string") return value.length > 0;
		if (Array.isArray(value)) return value.length > 0;
		return true;
	},
};

// ======= DECORADORES EXPORTADOS DIRECTAMENTE =======
export const Required = createValidatorDecorator(requiredValidator);
export const MaxLength = createValidatorFactoryDecorator("maxLength", createMaxLengthValidator);
export const MinLength = createValidatorFactoryDecorator("minLength", createMinLengthValidator);
export const NotEmpty = createValidatorDecorator(notEmptyValidator);
export const Length = createValidatorFactoryDecorator("length", createLengthValidator);

// ======= AUTO-REGISTRO =======
// Los validators se registran para uso en runtime
decoratorRegistry.registerValidator(requiredValidator);
decoratorRegistry.registerValidatorFactory("maxLength", createMaxLengthValidator);
decoratorRegistry.registerValidatorFactory("minLength", createMinLengthValidator);
decoratorRegistry.registerValidator(notEmptyValidator);
decoratorRegistry.registerValidatorFactory("length", createLengthValidator);
