import "reflect-metadata";
import type { Validator } from "../../types.js";
import { decoratorRegistry } from "../decorator-registry.js";
import { createValidatorDecorator, createValidatorFactoryDecorator } from "../shared-helpers.js";

export function createPatternValidator(pattern: string | RegExp): Validator {
	const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
	return {
		name: "pattern",
		stage: "isomorphic",
		defaultMessage: "Value doesn't match required pattern",
		validate: ({ value }) => {
			if (typeof value !== "string") return true;
			return regex.test(value);
		},
	};
}

export const emailValidator: Validator = {
	name: "email",
	stage: "isomorphic",
	defaultMessage: "Invalid email format",
	validate: ({ value }) => {
		if (typeof value !== "string") return true;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(value);
	},
};

export const uuidValidator: Validator = {
	name: "uuid",
	stage: "isomorphic",
	defaultMessage: "Invalid UUID format",
	validate: ({ value }) => {
		if (typeof value !== "string") return true;
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(value);
	},
};

export const urlValidator: Validator = {
	name: "url",
	stage: "isomorphic",
	defaultMessage: "Invalid URL format",
	validate: ({ value }) => {
		if (typeof value !== "string") return true;
		try {
			new URL(value);
			return true;
		} catch {
			return false;
		}
	},
};

export const numericStringValidator: Validator = {
	name: "numericString",
	stage: "isomorphic",
	defaultMessage: "Value must contain only digits",
	validate: ({ value }) => {
		if (typeof value !== "string") return true;
		return /^\d+$/.test(value);
	},
};

export const dateISOValidator: Validator = {
	name: "dateISO",
	stage: "isomorphic",
	defaultMessage: "Invalid ISO date format (YYYY-MM-DD)",
	validate: ({ value }) => {
		if (typeof value !== "string") return true;
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(value)) return false;

		// Verificar que sea una fecha válida
		const date = new Date(value + "T00:00:00Z");
		const [year, month, day] = value.split("-").map(Number);
		return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
	},
};

// ======= DECORADORES EXPORTADOS DIRECTAMENTE =======
export const Email = createValidatorDecorator(emailValidator);
export const Pattern = createValidatorFactoryDecorator("pattern", createPatternValidator);
export const UUID = createValidatorDecorator(uuidValidator);
export const Url = createValidatorDecorator(urlValidator);
export const NumericString = createValidatorDecorator(numericStringValidator);
export const DateISO = createValidatorDecorator(dateISOValidator);

// ======= AUTO-REGISTRO =======
// Los validators se registran para uso en runtime
decoratorRegistry.registerValidator(emailValidator);
decoratorRegistry.registerValidatorFactory("pattern", createPatternValidator);
decoratorRegistry.registerValidator(uuidValidator);
decoratorRegistry.registerValidator(urlValidator);
decoratorRegistry.registerValidator(numericStringValidator);
decoratorRegistry.registerValidator(dateISOValidator);
