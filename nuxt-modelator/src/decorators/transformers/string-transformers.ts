import "reflect-metadata";
import type { Transformer } from "../../types.js";
import { decoratorRegistry } from "../decorator-registry.js";
import { createTransformDecorator } from "../shared-helpers.js";

export const toLowerCaseTransformer: Transformer = {
	name: "toLowerCase",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string") {
			return value.toLowerCase();
		}
		return value;
	},
};

export const toUpperCaseTransformer: Transformer = {
	name: "toUpperCase",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string") {
			return value.toUpperCase();
		}
		return value;
	},
};

export const trimTransformer: Transformer = {
	name: "trim",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string") {
			return value.trim();
		}
		return value;
	},
};

export const capitalizeTransformer: Transformer = {
	name: "capitalize",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string" && value.length > 0) {
			return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
		}
		return value;
	},
};

export const slugifyTransformer: Transformer = {
	name: "slugify",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string") {
			return value
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "") // Remover acentos
				.replace(/[^a-z0-9\s-]/g, "") // Remover caracteres especiales
				.replace(/\s+/g, "-") // Reemplazar espacios con guiones
				.replace(/-+/g, "-") // Remover guiones duplicados
				.replace(/^-|-$/g, ""); // Remover guiones al inicio y final
		}
		return value;
	},
};

export const base64Transformer: Transformer = {
	name: "base64",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string") {
			try {
				// Si ya es base64 válido, lo devuelve tal como está
				const decoded = atob(value);
				btoa(decoded); // Verificar que se puede volver a encodear
				return value;
			} catch {
				// Si no es base64, lo convierte
				try {
					return btoa(value);
				} catch {
					return value; // Si no se puede convertir, devolver original
				}
			}
		}
		return value;
	},
};

export const urlEncodeTransformer: Transformer = {
	name: "urlEncode",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string") {
			try {
				// Si ya está URL encoded, lo decodifica primero y luego lo vuelve a encodear
				const decoded = decodeURIComponent(value);
				return encodeURIComponent(decoded);
			} catch {
				// Si no se puede decodificar, asumimos que no está encoded y lo encodeamos
				return encodeURIComponent(value);
			}
		}
		return value;
	},
};

export const sanitizeHtmlTransformer: Transformer = {
	name: "sanitizeHtml",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string") {
			// Implementación básica que remueve tags peligrosos
			return value
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
				.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
				.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
				.replace(/<embed\b[^>]*>/gi, "")
				.replace(/<link\b[^>]*>/gi, "")
				.replace(/<meta\b[^>]*>/gi, "")
				.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remover event handlers
				.replace(/javascript:/gi, "");
		}
		return value;
	},
};

export const escapeHtmlTransformer: Transformer = {
	name: "escapeHtml",
	stage: "isomorphic",
	transform: ({ value }) => {
		if (typeof value === "string") {
			return value
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#x27;")
				.replace(/\//g, "&#x2F;");
		}
		return value;
	},
};

// ======= DECORADORES EXPORTADOS DIRECTAMENTE =======
export const ToLowerCase = createTransformDecorator(toLowerCaseTransformer);
export const ToUpperCase = createTransformDecorator(toUpperCaseTransformer);
export const Trim = createTransformDecorator(trimTransformer);
export const Capitalize = createTransformDecorator(capitalizeTransformer);
export const Slugify = createTransformDecorator(slugifyTransformer);
export const Base64 = createTransformDecorator(base64Transformer);
export const UrlEncode = createTransformDecorator(urlEncodeTransformer);
export const SanitizeHtml = createTransformDecorator(sanitizeHtmlTransformer);
export const EscapeHtml = createTransformDecorator(escapeHtmlTransformer);

// ======= AUTO-REGISTRO =======
// Los transformers se registran para uso en runtime
decoratorRegistry.registerTransformer(toLowerCaseTransformer);
decoratorRegistry.registerTransformer(toUpperCaseTransformer);
decoratorRegistry.registerTransformer(trimTransformer);
decoratorRegistry.registerTransformer(capitalizeTransformer);
decoratorRegistry.registerTransformer(slugifyTransformer);
decoratorRegistry.registerTransformer(base64Transformer);
decoratorRegistry.registerTransformer(urlEncodeTransformer);
decoratorRegistry.registerTransformer(sanitizeHtmlTransformer);
decoratorRegistry.registerTransformer(escapeHtmlTransformer);
