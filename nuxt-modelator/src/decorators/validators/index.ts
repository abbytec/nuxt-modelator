import type { Validator } from "../../types.js";
import { decoratorRegistry } from "../decorator-registry.js";
import * as stringValidators from "./string-validators.js";
import * as genericValidators from "./generic-validators.js";
import * as numberValidators from "./number-validators.js";
import * as dateValidators from "./date-validators.js";

function isValidator(obj: any): obj is Validator {
	return (
		!!obj &&
		typeof obj === "object" &&
		typeof obj.name === "string" &&
		typeof obj.validate === "function" &&
		typeof obj.stage === "string" &&
		typeof obj.defaultMessage === "string"
	);
}

function extractFactoryName(exportName: string): string | null {
	const m = RegExp(/^create(.+)Validator$/).exec(exportName);
	if (!m) return null;
	const raw = m[1];
	return raw.charAt(0).toLowerCase() + raw.slice(1);
}

function registerModule(moduleExports: Record<string, any>) {
	for (const [key, value] of Object.entries(moduleExports)) {
		if (isValidator(value)) {
			decoratorRegistry.registerValidator(value);
			continue;
		}
		if (typeof value === "function") {
			const factoryName = extractFactoryName(key);
			if (factoryName) {
				// Wrapper genérico: pasa args[factoryName] si existe, de lo contrario pasa args tal cual
				decoratorRegistry.registerValidatorFactory(factoryName, (args: any) => {
					const param = args && Object.hasOwn(args, factoryName) ? args[factoryName] : args;
					return value(param);
				});
			}
		}
	}
}

registerModule(stringValidators);
registerModule(genericValidators);
registerModule(numberValidators);
registerModule(dateValidators);
