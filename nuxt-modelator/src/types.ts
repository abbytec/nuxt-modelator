export type Stage = "server" | "client" | "isomorphic";

export type MiddlewareSpec = string | { name: string; args?: any; stage?: "server" | "client" | "isomorphic" };

// Nuevo tipo para middlewares híbridos con soporte de anidación
export interface HybridMiddlewareSpec {
	name: string;
	args?: any;
	stage?: "server" | "client" | "hybrid" | "isomorphic";
	middlewares?: MiddlewareSpec[]; // Middlewares anidados que solo se ejecutan en servidor
}

// Tipo expandido que incluye todas las variantes
export type EnhancedMiddlewareSpec = string | MiddlewareSpec | HybridMiddlewareSpec;

export interface ModuleOptions {
	modelsDir?: string;
	inspector?: boolean;
}

// ======= CONFIGURACIÓN DE BASE DE DATOS =======

export interface MongoDbConfig {
	type: "mongo";
	connectionURI: string;
	options?: {
		dbName?: string;
		maxPoolSize?: number;
		minPoolSize?: number;
		maxIdleTimeMS?: number;
		serverSelectionTimeoutMS?: number;
		socketTimeoutMS?: number;
		family?: number;
	};
}

// Preparado para futuras bases de datos
export interface PostgresDbConfig {
	type: "postgres";
	connectionURI: string;
	options?: Record<string, any>;
}

export interface MySQLDbConfig {
	type: "mysql";
	connectionURI: string;
	options?: Record<string, any>;
}

export type DatabaseConfig = MongoDbConfig | PostgresDbConfig | MySQLDbConfig;

export interface ModelGlobalConfig {
	enableList?: boolean;
	plural?: string;
	basePath?: string; // default '/api'
	customReturn?: string; // nombre de resolver
	dbConfig?: DatabaseConfig;
}

export interface ModelApiMethods {
        get?: EnhancedMiddlewareSpec[];
        getAll?: EnhancedMiddlewareSpec[];
        create?: EnhancedMiddlewareSpec[];
        createAll?: EnhancedMiddlewareSpec[];
        update?: EnhancedMiddlewareSpec[];
        updateAll?: EnhancedMiddlewareSpec[];
        delete?: EnhancedMiddlewareSpec[];
        deleteAll?: EnhancedMiddlewareSpec[];
        getByName?: EnhancedMiddlewareSpec[];
        [key: string]: EnhancedMiddlewareSpec[] | undefined; // Para métodos custom
}

// ======= TIPOS DE MIDDLEWARES CON COMPOSICIÓN =======

// Función next que permite continuar la cadena de middlewares
export type NextFunction = () => Promise<void> | void;

// Contexto base compartido entre todos los middlewares
export interface BaseMiddlewareContext {
	op: string;
	model: string;
	args: any;
	state: Record<string, any>;
	done: (payload: any) => any;
}

// Contexto específico para middlewares de cliente
export interface ClientMiddlewareContext extends BaseMiddlewareContext {}

// Contexto específico para middlewares de servidor
export interface ServerMiddlewareContext extends BaseMiddlewareContext {
	event: import("h3").H3Event;
}

// Contexto para middlewares híbridos (puede tener o no event dependiendo del stage)
export interface HybridMiddlewareContext extends BaseMiddlewareContext {
	event?: import("h3").H3Event;
	stage: "server" | "client";
}

// Nuevos tipos de middleware con composición
export type ClientMiddleware = (ctx: ClientMiddlewareContext, next: NextFunction) => Promise<void> | void;
export type ServerMiddleware = (ctx: ServerMiddlewareContext, next: NextFunction) => Promise<void> | void;
export type HybridMiddleware = (ctx: HybridMiddlewareContext, next: NextFunction) => Promise<void> | void;

// Factories para crear middlewares configurables
export type ClientMiddlewareFactory = (config?: any) => ClientMiddleware;
export type ServerMiddlewareFactory = (config?: any) => ServerMiddleware;
export type HybridMiddlewareFactory = (config?: any) => HybridMiddleware;

// Tipos de middlewares (cliente/servidor) - DEPRECADOS, mantener para compatibilidad
export type OldClientMiddleware = (ctx: {
	op: string;
	model: string;
	args: any;
	state: any;
	done: (payload: any) => any;
}) => Promise<void> | void;
export type OldServerMiddleware = (ctx: {
	event: import("h3").H3Event;
	op: string;
	model: string;
	args: any;
	state: Record<string, any>;
	done: (payload: any) => any;
}) => Promise<void> | void;

export type OldClientMiddlewareFactory = (config?: any) => OldClientMiddleware;
export type OldServerMiddlewareFactory = (config?: any) => OldServerMiddleware;

// ======= TIPOS DEL SISTEMA DE DECORADORES =======

export interface ValidationError {
	field: string;
	value: any;
	rule: string;
	message: string;
	args?: any;
}

export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
}

type StageOptions = "client" | "server" | "isomorphic";
export interface TransformContext {
	value: any;
	field: string;
	target: any;
	stage: StageOptions;
}

export interface ValidatorContext {
	value: any;
	field: string;
	target: any;
	stage: StageOptions;
}

export interface DecoratorConfig {
	message?: string;
	stage?: StageOptions;
	args?: any;
}

// Tipos para transformers
export type TransformFn = (ctx: TransformContext) => any;
export interface Transformer {
	name: string;
	transform: TransformFn;
	stage: StageOptions;
}

// Tipos para validators
export type ValidatorFn = (ctx: ValidatorContext) => boolean | Promise<boolean>;
export interface Validator {
	name: string;
	validate: ValidatorFn;
	stage: StageOptions;
	defaultMessage: string;
}

// Tipos actualizados para el registry
export type PropTransform =
        | { kind: "transform"; transformer: Transformer; config: DecoratorConfig }
        | { kind: "validate"; validator: Validator; config: DecoratorConfig }
        | { kind: "mongoId"; config: { autogenerated?: boolean } };

export interface PropertyMeta {
	name: string;
	transforms: PropTransform[];
}

export interface ModelMeta {
	className: string;
	resource: string; // 'libro'
	plural: string; // 'libros'
	basePath: string;
	globalConfig: ModelGlobalConfig;
	apiMethods: ModelApiMethods;
	props: PropertyMeta[];
}

export interface Manifest {
	models: ModelMeta[];
	resolvers: Record<string, string>;
}
