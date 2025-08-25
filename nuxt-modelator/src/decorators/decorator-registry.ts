import type { Validator, Transformer, ValidationResult, TransformContext, ValidatorContext, ValidationError } from "../types.js";

class DecoratorRegistry {
	private readonly validators = new Map<string, Validator>();
	private readonly transformers = new Map<string, Transformer>();
	private readonly validatorFactories = new Map<string, (args: any) => Validator>();

	// Registro de validators
	registerValidator(validator: Validator) {
		this.validators.set(validator.name, validator);
	}

	getValidator(name: string): Validator | undefined {
		return this.validators.get(name);
	}

	getAllValidators(): Validator[] {
		return Array.from(this.validators.values());
	}

	// Registro de factories de validators
	registerValidatorFactory(name: string, factory: (args: any) => Validator) {
		this.validatorFactories.set(name, factory);
	}

	getValidatorFactory(name: string): ((args: any) => Validator) | undefined {
		return this.validatorFactories.get(name);
	}

	getAllValidatorFactories(): Array<{ name: string; factory: (args: any) => Validator }> {
		return Array.from(this.validatorFactories.entries()).map(([name, factory]) => ({ name, factory }));
	}

	// Registro de transformers
	registerTransformer(transformer: Transformer) {
		this.transformers.set(transformer.name, transformer);
	}

	getTransformer(name: string): Transformer | undefined {
		return this.transformers.get(name);
	}

	getAllTransformers(): Transformer[] {
		return Array.from(this.transformers.values());
	}

	// Ejecutar transformaciones
	async applyTransforms(
		value: any,
		field: string,
		target: any,
		stage: "client" | "server" | "isomorphic",
		transforms: { transformer: Transformer; config: any }[]
	): Promise<any> {
		let result = value;

		for (const { transformer } of transforms) {
			if (transformer.stage === stage || transformer.stage === "isomorphic") {
				const ctx: TransformContext = { value: result, field, target, stage };
				result = await transformer.transform(ctx);
			}
		}

		return result;
	}

	// Ejecutar validaciones
	async applyValidations(
		value: any,
		field: string,
		target: any,
		stage: "client" | "server" | "isomorphic",
		validations: { validator: Validator; config: any }[]
	): Promise<ValidationResult> {
		const errors: ValidationError[] = [];

		for (const { validator, config } of validations) {
			if (validator.stage === stage || validator.stage === "isomorphic") {
				const ctx: ValidatorContext = { value, field, target, stage };
				const isValid = await validator.validate(ctx);

				if (!isValid) {
					errors.push({
						field,
						value,
						rule: validator.name,
						message: config.message || validator.defaultMessage,
						args: config.args,
					});
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}
}

// Singleton instance
export const decoratorRegistry = new DecoratorRegistry();
