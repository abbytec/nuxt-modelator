import "reflect-metadata";
import type { Validator } from "../../types.js";
import { decoratorRegistry } from "../decorator-registry.js";
import { createValidatorDecorator } from "../shared-helpers.js";

const uniqueValidator: Validator = {
        name: "unique",
        stage: "isomorphic",
        defaultMessage: "Value must be unique",
        validate: () => true,
};

export const Unique = createValidatorDecorator(uniqueValidator);

decoratorRegistry.registerValidator(uniqueValidator);
