import "reflect-metadata";
import type { Validator } from "../../types.js";
import { decoratorRegistry } from "../decorator-registry.js";
import { createValidatorDecorator } from "../shared-helpers.js";

/**
 * Función helper para normalizar fechas a medianoche UTC
 * Esto permite comparar solo las fechas sin considerar las horas
 */
function normalizeToUTCDate(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Función helper para convertir un string a Date
 * Soporta formatos ISO, timestamps y objetos Date
 */
function parseToDate(value: any): Date | null {
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === "string") {
		const parsed = new Date(value);
		return isNaN(parsed.getTime()) ? null : parsed;
	}

	if (typeof value === "number") {
		const parsed = new Date(value);
		return isNaN(parsed.getTime()) ? null : parsed;
	}

	return null;
}

export const pastDateValidator: Validator = {
	name: "pastDate",
	stage: "isomorphic",
	defaultMessage: "Date must be in the past",
	validate: ({ value }) => {
		if (value == null) return false;

		const inputDate = parseToDate(value);
		if (!inputDate) return true;

		const today = normalizeToUTCDate(new Date());
		const normalizedInput = normalizeToUTCDate(inputDate);

		return normalizedInput < today;
	},
};

export const futureDateValidator: Validator = {
	name: "futureDate",
	stage: "isomorphic",
	defaultMessage: "Date must be in the future",
	validate: ({ value }) => {
		if (value == null) return false;

		const inputDate = parseToDate(value);
		if (!inputDate) return true;

		const today = normalizeToUTCDate(new Date());
		const normalizedInput = normalizeToUTCDate(inputDate);

		return normalizedInput > today;
	},
};

export const todayValidator: Validator = {
	name: "today",
	stage: "isomorphic",
	defaultMessage: "Date must be today",
	validate: ({ value }) => {
		if (value == null) return false;

		const inputDate = parseToDate(value);
		if (!inputDate) return true;

		const today = normalizeToUTCDate(new Date());
		const normalizedInput = normalizeToUTCDate(inputDate);

		return normalizedInput.getTime() === today.getTime();
	},
};

// ======= DECORADORES EXPORTADOS DIRECTAMENTE =======
export const PastDate = createValidatorDecorator(pastDateValidator);
export const FutureDate = createValidatorDecorator(futureDateValidator);
export const Today = createValidatorDecorator(todayValidator);

// ======= AUTO-REGISTRO =======
// Los validators se registran para uso en runtime
decoratorRegistry.registerValidator(pastDateValidator);
decoratorRegistry.registerValidator(futureDateValidator);
decoratorRegistry.registerValidator(todayValidator);
