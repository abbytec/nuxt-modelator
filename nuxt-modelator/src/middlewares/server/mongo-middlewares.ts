import type { ServerMiddleware, ModelMeta } from "../../types.js";
import { autoRegisterFromModule } from "../auto-registry.js";
import {
	findDocuments,
	findOneDocument,
	createDocument,
	updateDocument,
	deleteDocument,
	saveOrUpdateDocument,
	getConnectionInfo,
} from "../../utils/mongoose-manager.js";

// ======= HELPER PARA RESOLVER VARIABLES $xxx =======
function resolveVariables(obj: any, args: any): any {
	if (!obj || typeof obj !== "object") return obj;
	if (Array.isArray(obj)) return obj.map((item) => resolveVariables(item, args));

	const resolved: any = {};
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === "string" && value.startsWith("$")) {
			const argKey = value.slice(1);
			resolved[key] = args[argKey] ?? value;
		} else if (typeof value === "object") {
			resolved[key] = resolveVariables(value, args);
		} else {
			resolved[key] = value;
		}
	}
	return resolved;
}

// ======= MIDDLEWARE PARA QUERIES DE MONGODB =======

export function createMongoQueryMiddleware(config?: {
	operation?: "find" | "findOne";
	filter?: any;
	options?: {
		limit?: number;
		skip?: number;
		sort?: any;
		populate?: string[];
	};
}): ServerMiddleware {
	return async (ctx, next) => {
		// Verificar que estamos conectados a MongoDB
		if (ctx.state.db?.type !== "mongo") {
			console.warn("[mongo-query] MongoDB connection not detected, skipping");
			await next();
			return;
		}

		const modelMeta: ModelMeta | undefined = ctx.state.modelMeta;
		if (!modelMeta) {
			console.warn("[mongo-query] ModelMeta not found in context, skipping");
			await next();
			return;
		}

		try {
			const operation = config?.operation || "find";
			const rawFilter = config?.filter || ctx.args?.filter || {};
			const rawOptions = config?.options || ctx.args?.options || {};

			// Resolver variables $xxx con ctx.args
			const filter = resolveVariables(rawFilter, ctx.args || {});
			const options = resolveVariables(rawOptions, ctx.args || {});

			console.debug(`[mongo-query] Executing ${operation} on ${modelMeta.className} with filter:`, filter);

			let result;
			if (operation === "findOne") {
				result = await findOneDocument(modelMeta, filter, options);
			} else {
				result = await findDocuments(modelMeta, filter, options);
			}

			if (result.success) {
				ctx.state.mongoResult = result;
				ctx.state.data = result.data;
				console.debug(
					`[mongo-query] Query successful, found ${Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0} item(s)`
				);
			} else {
				console.error(`[mongo-query] Query failed:`, result.error);
				return ctx.done({
					status: 500,
					code: "MONGO_QUERY_ERROR",
					message: result.error,
				});
			}

			await next();
		} catch (error) {
			console.error("[mongo-query] Middleware error:", error);
			return ctx.done({
				status: 500,
				code: "MONGO_MIDDLEWARE_ERROR",
				message: error instanceof Error ? error.message : "MongoDB query middleware error",
			});
		}
	};
}

// ======= MIDDLEWARE PARA GUARDAR DOCUMENTOS =======

export function createMongoSaveMiddleware(config?: {
	operation?: "create" | "update" | "saveOrUpdate";
	filter?: any;
	upsert?: boolean;
}): ServerMiddleware {
	return async (ctx, next) => {
		// Verificar que estamos conectados a MongoDB
		if (ctx.state.db?.type !== "mongo") {
			console.warn("[mongo-save] MongoDB connection not detected, skipping");
			await next();
			return;
		}

		const modelMeta: ModelMeta | undefined = ctx.state.modelMeta;
		if (!modelMeta) {
			console.warn("[mongo-save] ModelMeta not found in context, skipping");
			await next();
			return;
		}

		try {
			const operation = config?.operation || "create";
			const data = ctx.state.validatedData || ctx.args?.data || ctx.args;
			const rawFilter = config?.filter || ctx.args?.filter;
			const filter = resolveVariables(rawFilter, ctx.args || {});

			if (!data || typeof data !== "object") {
				return ctx.done({
					status: 400,
					code: "INVALID_DATA",
					message: "Valid data object is required for save operation",
				});
			}

			console.debug(`[mongo-save] Executing ${operation} on ${modelMeta.className} with data:`, data);

			let result;
			switch (operation) {
				case "create":
					result = await createDocument(modelMeta, data);
					break;
				case "update":
					if (!filter) {
						return ctx.done({
							status: 400,
							code: "MISSING_FILTER",
							message: "Filter is required for update operation",
						});
					}
					result = await updateDocument(modelMeta, filter, data, {
						upsert: config?.upsert || false,
						new: true,
					});
					break;
				case "saveOrUpdate":
					result = await saveOrUpdateDocument(modelMeta, data, filter);
					break;
				default:
					return ctx.done({
						status: 400,
						code: "INVALID_OPERATION",
						message: `Unsupported save operation: ${operation}`,
					});
			}

			if (result.success) {
				ctx.state.mongoResult = result;
				ctx.state.data = result.data;
				ctx.state.savedData = result.data;
				console.debug(`[mongo-save] Save successful for ${modelMeta.className}`);
			} else {
				console.error(`[mongo-save] Save failed:`, result.error);
				return ctx.done({
					status: 500,
					code: "MONGO_SAVE_ERROR",
					message: result.error,
				});
			}

			await next();
		} catch (error) {
			console.error("[mongo-save] Middleware error:", error);
			return ctx.done({
				status: 500,
				code: "MONGO_MIDDLEWARE_ERROR",
				message: error instanceof Error ? error.message : "MongoDB save middleware error",
			});
		}
	};
}

// ======= MIDDLEWARE PARA ACTUALIZAR DOCUMENTOS =======

export function createMongoUpdateMiddleware(config?: { filter?: any; upsert?: boolean; multi?: boolean }): ServerMiddleware {
	return async (ctx, next) => {
		// Verificar que estamos conectados a MongoDB
		if (ctx.state.db?.type !== "mongo") {
			console.warn("[mongo-update] MongoDB connection not detected, skipping");
			await next();
			return;
		}

		const modelMeta: ModelMeta | undefined = ctx.state.modelMeta;
		if (!modelMeta) {
			console.warn("[mongo-update] ModelMeta not found in context, skipping");
			await next();
			return;
		}

		try {
			const rawFilter = config?.filter || ctx.args?.filter || ctx.args?.id ? { _id: ctx.args.id } : {};
			const filter = resolveVariables(rawFilter, ctx.args || {});
			const updateData = ctx.state.validatedData || ctx.args?.data || ctx.args?.update;

			if (!updateData || typeof updateData !== "object") {
				return ctx.done({
					status: 400,
					code: "INVALID_UPDATE_DATA",
					message: "Valid update data is required",
				});
			}

			if (Object.keys(filter).length === 0) {
				return ctx.done({
					status: 400,
					code: "MISSING_FILTER",
					message: "Filter or ID is required for update operation",
				});
			}

			console.debug(`[mongo-update] Updating ${modelMeta.className} with filter:`, filter);

			const result = await updateDocument(modelMeta, filter, updateData, {
				upsert: config?.upsert || false,
				new: true,
			});

			if (result.success) {
				ctx.state.mongoResult = result;
				ctx.state.data = result.data;
				ctx.state.updatedData = result.data;
				console.debug(`[mongo-update] Update successful for ${modelMeta.className}`);
			} else {
				console.error(`[mongo-update] Update failed:`, result.error);
				return ctx.done({
					status: 500,
					code: "MONGO_UPDATE_ERROR",
					message: result.error,
				});
			}

			await next();
		} catch (error) {
			console.error("[mongo-update] Middleware error:", error);
			return ctx.done({
				status: 500,
				code: "MONGO_MIDDLEWARE_ERROR",
				message: error instanceof Error ? error.message : "MongoDB update middleware error",
			});
		}
	};
}

// ======= MIDDLEWARE PARA ELIMINAR DOCUMENTOS =======

export function createMongoDeleteMiddleware(config?: { filter?: any; confirmDeletion?: boolean }): ServerMiddleware {
	return async (ctx, next) => {
		// Verificar que estamos conectados a MongoDB
		if (ctx.state.db?.type !== "mongo") {
			console.warn("[mongo-delete] MongoDB connection not detected, skipping");
			await next();
			return;
		}

		const modelMeta: ModelMeta | undefined = ctx.state.modelMeta;
		if (!modelMeta) {
			console.warn("[mongo-delete] ModelMeta not found in context, skipping");
			await next();
			return;
		}

		try {
			const rawFilter = config?.filter || ctx.args?.filter || ctx.args?.id ? { _id: ctx.args.id } : {};
			const filter = resolveVariables(rawFilter, ctx.args || {});

			if (Object.keys(filter).length === 0) {
				return ctx.done({
					status: 400,
					code: "MISSING_FILTER",
					message: "Filter or ID is required for delete operation",
				});
			}

			// Verificación opcional de confirmación
			if (config?.confirmDeletion && !ctx.args?.confirmed) {
				return ctx.done({
					status: 400,
					code: "CONFIRMATION_REQUIRED",
					message: "Delete operation requires confirmation",
				});
			}

			console.debug(`[mongo-delete] Deleting from ${modelMeta.className} with filter:`, filter);

			const result = await deleteDocument(modelMeta, filter);

			if (result.success) {
				ctx.state.mongoResult = result;
				ctx.state.data = result.data;
				ctx.state.deletedCount = result.data?.deletedCount || 0;
				console.debug(`[mongo-delete] Delete successful, removed ${result.data?.deletedCount || 0} document(s)`);
			} else {
				console.error(`[mongo-delete] Delete failed:`, result.error);
				return ctx.done({
					status: 500,
					code: "MONGO_DELETE_ERROR",
					message: result.error,
				});
			}

			await next();
		} catch (error) {
			console.error("[mongo-delete] Middleware error:", error);
			return ctx.done({
				status: 500,
				code: "MONGO_MIDDLEWARE_ERROR",
				message: error instanceof Error ? error.message : "MongoDB delete middleware error",
			});
		}
	};
}

// ======= MIDDLEWARE PARA SAVEUPDATE (UPSERT) =======

export function createMongoSaveOrUpdateMiddleware(config?: { filter?: any; preferUpdate?: boolean }): ServerMiddleware {
	return async (ctx, next) => {
		// Verificar que estamos conectados a MongoDB
		if (ctx.state.db?.type !== "mongo") {
			console.warn("[mongo-save-or-update] MongoDB connection not detected, skipping");
			await next();
			return;
		}

		const modelMeta: ModelMeta | undefined = ctx.state.modelMeta;
		if (!modelMeta) {
			console.warn("[mongo-save-or-update] ModelMeta not found in context, skipping");
			await next();
			return;
		}

		try {
			const data = ctx.state.validatedData || ctx.args?.data || ctx.args;
			const rawFilter = config?.filter || (data?._id ? { _id: data._id } : data?.id ? { _id: data.id } : null);
			const filter = resolveVariables(rawFilter, ctx.args || {});

			if (!data || typeof data !== "object") {
				return ctx.done({
					status: 400,
					code: "INVALID_DATA",
					message: "Valid data object is required",
				});
			}

			console.debug(`[mongo-save-or-update] Save or update ${modelMeta.className} with filter:`, filter);

			const result = await saveOrUpdateDocument(modelMeta, data, filter);

			if (result.success) {
				ctx.state.mongoResult = result;
				ctx.state.data = result.data;
				ctx.state.savedData = result.data;
				console.debug(`[mongo-save-or-update] SaveOrUpdate successful for ${modelMeta.className}`);
			} else {
				console.error(`[mongo-save-or-update] SaveOrUpdate failed:`, result.error);
				return ctx.done({
					status: 500,
					code: "MONGO_SAVE_OR_UPDATE_ERROR",
					message: result.error,
				});
			}

			await next();
		} catch (error) {
			console.error("[mongo-save-or-update] Middleware error:", error);
			return ctx.done({
				status: 500,
				code: "MONGO_MIDDLEWARE_ERROR",
				message: error instanceof Error ? error.message : "MongoDB saveOrUpdate middleware error",
			});
		}
	};
}

// ======= MIDDLEWARE DE INFORMACIÓN Y DEBUG =======

export function createMongoInfoMiddleware(): ServerMiddleware {
	return async (ctx, next) => {
		const connectionInfo = getConnectionInfo();

		ctx.state.mongoInfo = connectionInfo;

		if (connectionInfo.connected) {
			console.debug("[mongo-info] MongoDB connection status:", connectionInfo);
		}

		await next();
	};
}

// ======= AUTO-REGISTRO =======
autoRegisterFromModule(
	{
		createMongoQueryMiddleware,
		createMongoSaveMiddleware,
		createMongoUpdateMiddleware,
		createMongoDeleteMiddleware,
		createMongoSaveOrUpdateMiddleware,
		createMongoInfoMiddleware,
	},
	"server",
	"mongo-middlewares"
);
