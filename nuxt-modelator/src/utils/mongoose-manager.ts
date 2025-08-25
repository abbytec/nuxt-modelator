import type { MongoDbConfig, ModelMeta } from "../types.js";

// ======= INTERFACES INTERNAS =======

interface MongooseConnection {
	isConnected: boolean;
	connection: any; // mongoose.Connection
	models: Map<string, any>; // mongoose.Model
	config: MongoDbConfig;
	connectedAt: Date;
}

interface SchemaFieldDefinition {
	type?: any;
	required?: boolean;
	default?: any;
	unique?: boolean;
	index?: boolean;
	validate?: any;
	transform?: (value: any) => any;
}

// ======= ESTADO GLOBAL =======

let mongoose: any = null;
let currentConnection: MongooseConnection | null = null;

// ======= UTILIDADES HELPERS =======

function getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
}

// ======= UTILIDADES DE IMPORTACIÓN =======

async function ensureMongoose() {
	if (!mongoose) {
		try {
			// @ts-ignore - Dynamic import, mongoose is optional dependency
			mongoose = await import("mongoose");
			console.info("[mongoose-manager] Mongoose loaded successfully");
		} catch (error) {
			const errorMessage = error instanceof Error ? getErrorMessage(error) : String(error);
			throw new Error(
				`[mongoose-manager] Mongoose is required for MongoDB support. Install it with: npm install mongoose @types/mongoose. Error: ${errorMessage}`
			);
		}
	}
	return mongoose;
}

// ======= GESTIÓN DE CONEXIONES =======

export async function connectToMongoDB(config: MongoDbConfig): Promise<MongooseConnection> {
	const mg = await ensureMongoose();

	// Reusar conexión existente si es la misma URI
	if (currentConnection?.isConnected && currentConnection.config.connectionURI === config.connectionURI) {
		console.debug("[mongoose-manager] Reusing existing connection");
		return currentConnection;
	}

	try {
		console.info(`[mongoose-manager] Connecting to MongoDB: ${config.connectionURI.replace(/\/\/.*@/, "//***@")}`);

		const connection = await mg.connect(config.connectionURI, {
			...config.options,
			// Defaults para mejor rendimiento
			maxPoolSize: config.options?.maxPoolSize ?? 10,
			minPoolSize: config.options?.minPoolSize ?? 5,
			maxIdleTimeMS: config.options?.maxIdleTimeMS ?? 30000,
			serverSelectionTimeoutMS: config.options?.serverSelectionTimeoutMS ?? 5000,
			socketTimeoutMS: config.options?.socketTimeoutMS ?? 45000,
		});

		currentConnection = {
			isConnected: true,
			connection: mg.connection,
			models: new Map(),
			config,
			connectedAt: new Date(),
		};

		console.info("[mongoose-manager] MongoDB connection established");
		return currentConnection;
	} catch (error) {
		console.error("[mongoose-manager] MongoDB connection failed:", error);
		const errorMessage = error instanceof Error ? getErrorMessage(error) : String(error);
		throw new Error(`Failed to connect to MongoDB: ${errorMessage}`);
	}
}

export async function disconnectFromMongoDB(): Promise<void> {
	if (currentConnection?.isConnected) {
		const mg = await ensureMongoose();
		await mg.disconnect();
		currentConnection = null;
		console.info("[mongoose-manager] MongoDB disconnected");
	}
}

export function getMongoConnection(): MongooseConnection | null {
	return currentConnection;
}

// ======= GENERACIÓN AUTOMÁTICA DE SCHEMAS =======

function typeScriptToMongooseType(jsType: string): any {
	const mg = mongoose;

	const typeMap: Record<string, any> = {
		string: mg.Schema.Types.String,
		number: mg.Schema.Types.Number,
		boolean: mg.Schema.Types.Boolean,
		date: mg.Schema.Types.Date,
		object: mg.Schema.Types.Mixed,
		array: [mg.Schema.Types.Mixed],
	};

	return typeMap[jsType.toLowerCase()] || mg.Schema.Types.Mixed;
}

function generateSchemaFromModel(modelMeta: ModelMeta): any {
	const mg = mongoose;
	const schemaDefinition: Record<string, SchemaFieldDefinition> = {};

	// Auto-agregar _id si no está presente
	if (!modelMeta.props.find((prop) => prop.name === "id" || prop.name === "_id")) {
		schemaDefinition._id = {
			type: mg.Schema.Types.ObjectId,
			required: true,
		};
	}

	// Procesar propiedades del modelo
	for (const prop of modelMeta.props) {
		const fieldDef: SchemaFieldDefinition = {};

		// Determinar tipo base (por ahora usar Mixed, pero se puede mejorar con reflection)
		fieldDef.type = mg.Schema.Types.Mixed;

		// Procesar transforms/validators para determinar configuración
		for (const transform of prop.transforms) {
			if (transform.kind === "validate") {
				const validator = transform.validator;

				// Configurar required
				if (validator.name === "required") {
					fieldDef.required = true;
				}

				// Configurar unique
				if (validator.name === "unique") {
					fieldDef.unique = true;
				}

				// Configurar tipo específico basado en validadores
				if (validator.name === "email") {
					fieldDef.type = mg.Schema.Types.String;
					fieldDef.validate = {
						validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
						message: "Invalid email format",
					};
				}

				if (validator.name === "uuid") {
					fieldDef.type = mg.Schema.Types.String;
				}

				if (validator.name === "url") {
					fieldDef.type = mg.Schema.Types.String;
				}

				if (validator.name === "numericString") {
					fieldDef.type = mg.Schema.Types.String;
					fieldDef.validate = {
						validator: (v: string) => /^\d+$/.test(v),
						message: "Must contain only digits",
					};
				}

				if (validator.name === "dateISO") {
					fieldDef.type = mg.Schema.Types.Date;
				}
			}

			if (transform.kind === "transform") {
				const transformer = transform.transformer;

				// Aplicar transforms como mongoose transforms
				if (transformer.name === "toLowerCase") {
					fieldDef.type = mg.Schema.Types.String;
					fieldDef.transform = (v: string) => v?.toLowerCase();
				}

				if (transformer.name === "trim") {
					fieldDef.type = mg.Schema.Types.String;
					fieldDef.transform = (v: string) => v?.trim();
				}

				if (transformer.name === "slugify") {
					fieldDef.type = mg.Schema.Types.String;
					fieldDef.transform = (v: string) =>
						v
							?.toLowerCase()
							.normalize("NFD")
							.replace(/[\u0300-\u036f]/g, "")
							.replace(/[^a-z0-9\s-]/g, "")
							.replace(/\s+/g, "-")
							.replace(/-+/g, "-")
							.replace(/^-|-$/g, "");
				}
			}
		}

		schemaDefinition[prop.name] = fieldDef;
	}

	// Crear schema con configuración adicional
	const schema = new mg.Schema(schemaDefinition, {
		timestamps: true, // Agregar createdAt y updatedAt automáticamente
		versionKey: false, // Deshabilitar __v
		collection: modelMeta.plural, // Usar el plural como nombre de colección
	});

	// Agregar índices automáticos para campos únicos
	Object.entries(schemaDefinition).forEach(([fieldName, fieldDef]) => {
		if (fieldDef.unique || fieldDef.index) {
			schema.index({ [fieldName]: 1 });
		}
	});

	return schema;
}

export async function getOrCreateMongoModel(modelMeta: ModelMeta): Promise<any> {
	if (!currentConnection?.isConnected) {
		throw new Error("[mongoose-manager] No active MongoDB connection");
	}

	const modelName = modelMeta.className;

	// Reusar modelo existente
	if (currentConnection.models.has(modelName)) {
		return currentConnection.models.get(modelName);
	}

	const mg = await ensureMongoose();

	// Generar schema automáticamente
	const schema = generateSchemaFromModel(modelMeta);

	// Crear modelo
	const model = mg.model(modelName, schema);

	// Cachear modelo
	currentConnection.models.set(modelName, model);

	console.info(`[mongoose-manager] Auto-generated Mongoose model for: ${modelName}`);
	console.debug(`[mongoose-manager] Schema for ${modelName}:`, schema.paths);

	return model;
}

// ======= OPERACIONES CRUD HELPERS =======

export interface CrudOperationResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	count?: number;
}

export async function findDocuments<T = any>(
	modelMeta: ModelMeta,
	filter: any = {},
	options: { limit?: number; skip?: number; sort?: any; populate?: string[] } = {}
): Promise<CrudOperationResult<T[]>> {
	try {
		const model = await getOrCreateMongoModel(modelMeta);

		let query = model.find(filter);

		if (options.limit) query = query.limit(options.limit);
		if (options.skip) query = query.skip(options.skip);
		if (options.sort) query = query.sort(options.sort);
		if (options.populate) {
			options.populate.forEach((field) => {
				query = query.populate(field);
			});
		}

		const data = await query.exec();

		return { success: true, data, count: data.length };
	} catch (error) {
		return { success: false, error: getErrorMessage(error) };
	}
}

export async function findOneDocument<T = any>(
	modelMeta: ModelMeta,
	filter: any,
	options: { populate?: string[] } = {}
): Promise<CrudOperationResult<T>> {
	try {
		const model = await getOrCreateMongoModel(modelMeta);

		let query = model.findOne(filter);

		if (options.populate) {
			options.populate.forEach((field) => {
				query = query.populate(field);
			});
		}

		const data = await query.exec();

		return { success: true, data };
	} catch (error) {
		return { success: false, error: getErrorMessage(error) };
	}
}

export async function createDocument<T = any>(modelMeta: ModelMeta, data: any): Promise<CrudOperationResult<T>> {
	try {
		const model = await getOrCreateMongoModel(modelMeta);
		const doc = new model(data);
		const saved = await doc.save();

		return { success: true, data: saved };
	} catch (error) {
		return { success: false, error: getErrorMessage(error) };
	}
}

export async function updateDocument<T = any>(
	modelMeta: ModelMeta,
	filter: any,
	update: any,
	options: { upsert?: boolean; new?: boolean } = { new: true }
): Promise<CrudOperationResult<T>> {
	try {
		const model = await getOrCreateMongoModel(modelMeta);
		const data = await model.findOneAndUpdate(filter, update, options).exec();

		return { success: true, data };
	} catch (error) {
		return { success: false, error: getErrorMessage(error) };
	}
}

export async function deleteDocument(modelMeta: ModelMeta, filter: any): Promise<CrudOperationResult<{ deletedCount: number }>> {
	try {
		const model = await getOrCreateMongoModel(modelMeta);
		const result = await model.deleteOne(filter).exec();

		return {
			success: true,
			data: { deletedCount: result.deletedCount || 0 },
		};
	} catch (error) {
		return { success: false, error: getErrorMessage(error) };
	}
}

export async function saveOrUpdateDocument<T = any>(modelMeta: ModelMeta, data: any, filter?: any): Promise<CrudOperationResult<T>> {
	try {
		const model = await getOrCreateMongoModel(modelMeta);

		// Si no hay filtro, buscar por _id o id si existe en los datos
		const searchFilter = filter || (data._id ? { _id: data._id } : data.id ? { _id: data.id } : null);

		if (searchFilter) {
			// Intentar actualizar primero
			const updated = await model.findOneAndUpdate(searchFilter, data, { new: true, upsert: true }).exec();
			return { success: true, data: updated };
		} else {
			// Crear nuevo documento
			const doc = new model(data);
			const saved = await doc.save();
			return { success: true, data: saved };
		}
	} catch (error) {
		return { success: false, error: getErrorMessage(error) };
	}
}

// ======= UTILIDADES DE DEBUG =======

export function getConnectionInfo(): any {
	if (!currentConnection?.isConnected) {
		return { connected: false };
	}

	return {
		connected: true,
		connectionURI: currentConnection.config.connectionURI.replace(/\/\/.*@/, "//***@"),
		connectedAt: currentConnection.connectedAt,
		modelsLoaded: Array.from(currentConnection.models.keys()),
		readyState: currentConnection.connection.readyState,
		db: currentConnection.connection.db?.databaseName,
	};
}
