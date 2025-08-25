import type { ServerMiddleware, ModelMeta, DatabaseConfig, MongoDbConfig } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";
import { connectToMongoDB, disconnectFromMongoDB, getMongoConnection, getConnectionInfo } from "../../utils/mongoose-manager.js";

// ======= MIDDLEWARE DE BASE DE DATOS ADAPTATIVO =======

export function createDbConnectMiddleware(config?: {
	connectionString?: string;
	timeout?: number;
	retries?: number;
	dbConfig?: DatabaseConfig;
}): ServerMiddleware {
	return async (ctx, next) => {
		try {
			// Priorizar dbConfig del modelo si está disponible
			const modelMeta: ModelMeta | undefined = ctx.state.modelMeta;
			const dbConfig = modelMeta?.globalConfig?.dbConfig || config?.dbConfig;

			if (dbConfig) {
				// Usar configuración específica de base de datos
				await handleDatabaseConnection(dbConfig, ctx);
			} else {
				// Fallback a configuración tradicional
				const connectionString = config?.connectionString || "demo://localhost:5432/db";
				const timeout = config?.timeout || 5000;

				console.info(`[db] Connecting to database: ${connectionString}`);

				// Simular conexión tradicional
				ctx.state.db = {
					connected: true,
					connectionString,
					connectedAt: new Date().toISOString(),
					queryCount: 0,
					type: "generic",
				};

				console.info(`[db] Generic database connection established`);
			}

			// Continuar con próximos middlewares
			await next();
		} catch (error) {
			console.error(`[db] Database connection failed:`, error);
			return ctx.done({
				status: 500,
				code: "DATABASE_ERROR",
				message: error instanceof Error ? error.message : "Failed to connect to database",
			});
		} finally {
			// Cleanup automático solo para conexiones genéricas
			if (ctx.state.db?.type === "generic" && ctx.state.db?.connected) {
				console.info(`[db] Generic database connection closed. Queries executed: ${ctx.state.db.queryCount || 0}`);
				ctx.state.db.connected = false;
			}
		}
	};
}

// ======= HANDLER ESPECÍFICO POR TIPO DE BASE DE DATOS =======

async function handleDatabaseConnection(dbConfig: DatabaseConfig, ctx: any) {
	switch (dbConfig.type) {
		case "mongo":
			await handleMongoConnection(dbConfig as MongoDbConfig, ctx);
			break;
		case "postgres":
			// Future implementation
			console.warn("[db] PostgreSQL support not yet implemented, falling back to generic");
			ctx.state.db = { connected: true, type: "postgres", pending: true };
			break;
		case "mysql":
			// Future implementation
			console.warn("[db] MySQL support not yet implemented, falling back to generic");
			ctx.state.db = { connected: true, type: "mysql", pending: true };
			break;
		default:
			throw new Error(`[db] Unsupported database type: ${(dbConfig as any).type}`);
	}
}

async function handleMongoConnection(mongoConfig: MongoDbConfig, ctx: any) {
	console.info(`[db] Connecting to MongoDB...`);

	const connection = await connectToMongoDB(mongoConfig);

	ctx.state.db = {
		connected: true,
		type: "mongo",
		connection: connection,
		connectionInfo: getConnectionInfo(),
		connectedAt: connection.connectedAt.toISOString(),
		config: mongoConfig,
	};

	console.info(`[db] MongoDB connection established`);
}

export function createTransactionMiddleware(config?: {
	isolationLevel?: "READ_COMMITTED" | "SERIALIZABLE";
	timeout?: number;
}): ServerMiddleware {
	return async (ctx, next) => {
		if (!ctx.state.db?.connected) {
			return ctx.done({
				status: 500,
				code: "NO_DATABASE_CONNECTION",
				message: "Database connection required for transactions",
			});
		}

		const isolationLevel = config?.isolationLevel || "READ_COMMITTED";
		console.info(`[db] Starting transaction with isolation level: ${isolationLevel}`);

		try {
			// Simular inicio de transacción
			ctx.state.db.transaction = {
				id: `tx_${Date.now()}`,
				isolationLevel,
				startedAt: new Date().toISOString(),
				status: "ACTIVE",
			};

			// Ejecutar middlewares dentro de la transacción
			await next();

			// Si llegamos aquí, commitear la transacción
			if (ctx.state.db.transaction?.status === "ACTIVE") {
				console.info(`[db] Committing transaction: ${ctx.state.db.transaction.id}`);
				ctx.state.db.transaction.status = "COMMITTED";
				ctx.state.db.transaction.committedAt = new Date().toISOString();
			}
		} catch (error) {
			// Rollback en caso de error
			if (ctx.state.db.transaction?.status === "ACTIVE") {
				console.error(`[db] Rolling back transaction: ${ctx.state.db.transaction.id}`, error);
				ctx.state.db.transaction.status = "ROLLED_BACK";
				ctx.state.db.transaction.rolledBackAt = new Date().toISOString();
			}
			throw error; // Re-lanzar el error
		}
	};
}

// ======= AUTO-REGISTRO =======
autoRegisterFromModule(
	{
		createDbConnectMiddleware,
		createTransactionMiddleware,
	},
	"server",
	"db-middlewares"
);
