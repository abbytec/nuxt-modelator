import "reflect-metadata";
import { Model, Required, UUID, Email, NotEmpty, Trim, Slugify, PastDate, MaxLength, IsPositive, Length } from "nuxt-modelator/dist/decorators";
import {
	timed,
	dbConnect,
	mongoQuery,
	mongoSave,
	mongoUpdate,
	mongoDelete,
	mongoSaveOrUpdate,
	mongoCrudBlock,
	mongoBlock,
	mongoInfo,
	debug,
	rateLimit,
	addToPlural,
	populateArray,
} from "nuxt-modelator/dist/middlewares";

// Alias temporales para los nuevos middlewares híbridos
// @ts-ignore - Los middlewares híbridos están disponibles en runtime pero faltan en las declaraciones
const {
        postAllRequest,
        getAllRequest,
        getRequest,
        putRequest,
        deleteRequest,
        logRequest,
} = require("nuxt-modelator/dist/middlewares");

// ✨ MODELO COMPLETO CON MONGODB Y COMPOSICIÓN VERDADERA
@Model(
	// ======= CONFIGURACIÓN GLOBAL =======
	{
		enableList: true,
		plural: "productos",
		basePath: "/api",
		// 🍃 CONFIGURACIÓN DE MONGODB
		dbConfig: {
			type: "mongo",
			connectionURI: "mongodb://modelator:modelator123@localhost:27018/nuxt-modelator-demo",
			options: {
				dbName: "nuxt-modelator-demo",
				maxPoolSize: 10,
				minPoolSize: 5,
				maxIdleTimeMS: 30000,
				serverSelectionTimeoutMS: 5000,
				socketTimeoutMS: 45000,
			},
		},
	},
	// ======= ENDPOINTS CON SEPARACIÓN CLIENT/SERVER =======
        // ✨ NUEVA SINTAXIS HÍBRIDA:
        // - logRequest(): Se ejecuta en cliente Y servidor para logging completo
        // - postAllRequest/getAllRequest/etc.: Requests HTTP con middlewares anidados en servidor
        // - addToPlural(): Se ejecuta solo en cliente después de la respuesta HTTP para CREAR
        // - populateArray(): Sobrescriba el array completo con datos de lectura
	{
		// 📋 CREATE: Crear nuevo producto
                create: [
                        logRequest(), // aparece en la consola del navegador y servidor
                        postAllRequest({
				middlewares: [
					timed({ label: "create-product", logResults: true }),
					rateLimit({ maxRequests: 5, windowMs: 60000 }), // Max 5 por minuto
					debug({ logState: false, logTiming: true }),
					...mongoCrudBlock("create"), // Auto-detecta MongoDB y crea documento
				], // Solo se ejecutan en servidor
			}),
			addToPlural({ position: "unshift" }), // Se ejecuta en cliente después de la respuesta
		],

		// 📖 READ ALL: Obtener todos los productos (paginado)
                getAll: [
                        logRequest(),
                        getAllRequest({
				middlewares: [
					timed({ label: "get-all-products" }),
					dbConnect(), // Auto-detecta MongoDB del dbConfig
					mongoInfo(), // Agregar info de conexión al response
					mongoQuery({
						operation: "find",
						options: {
							limit: 50,
							sort: { createdAt: -1 }, // Más recientes primero
							// populate: ["supplier"] // Si tuviera relaciones
						},
					}),
				],
			}),
			populateArray(), // Sobrescribir array completo con datos de DB
		],

		// 🔍 READ ONE: Obtener producto por ID
                get: [
                        logRequest(),
                        getRequest({
				middlewares: [
					timed({ label: "get-product-by-id" }),
					dbConnect(),
					mongoQuery({
						operation: "findOne",
						filter: { _id: "$id" }, // $id viene de los parámetros de URL
					}),
				],
			}),
		],

		// ✏️ UPDATE: Actualizar producto existente
                update: [
                        logRequest({ logLevel: "info" }),
                        putRequest({
				middlewares: [
					timed({ label: "update-product", threshold: 500 }), // Solo loguear si toma >500ms
					rateLimit({ maxRequests: 10, windowMs: 60000 }),
					mongoUpdate({
						filter: { _id: "$id" },
						upsert: false, // No crear si no existe
					}),
				], // Solo se ejecutan en servidor
			}),
		],

		// ❌ DELETE: Eliminar producto
                delete: [
                        logRequest({ logLevel: "warn" }), // Log más visible para operaciones de eliminación
                        deleteRequest({
				middlewares: [
					timed({ label: "delete-product" }),
					rateLimit({ maxRequests: 3, windowMs: 60000 }), // Más restrictivo para delete
					mongoDelete({
						filter: { _id: "$id" },
						confirmDeletion: false, // Para el demo, no requerir confirmación
					}),
				], // Solo se ejecutan en servidor
			}),
		],

		// 🔄 SAVE OR UPDATE: Crear o actualizar (upsert)
                saveOrUpdate: [
                        logRequest(),
                        postAllRequest({
				middlewares: [
					timed({ label: "save-or-update-product" }),
					rateLimit({ maxRequests: 10, windowMs: 60000 }),
					mongoSaveOrUpdate(), // Auto-detecta si crear o actualizar por _id
				], // Solo se ejecutan en servidor
			}),
			addToPlural({ position: "unshift" }), // Actualizar cliente después de la respuesta
		],

		// ======= MÉTODOS PERSONALIZADOS =======

		// 🏷️ Buscar por categoría
                getByCategory: [
                        logRequest(),
                        getAllRequest({
				middlewares: [
					timed({ label: "get-by-category" }),
					dbConnect(),
					mongoQuery({
						operation: "find",
						filter: { category: "$category" }, // $category viene de los args
						options: {
							sort: { name: 1 }, // Alfabético
							limit: 25,
						},
					}),
				],
			}),
			populateArray(), // Sobrescribir array con resultados filtrados
		],

		// 💰 Productos en oferta
                getOnSale: [
                        logRequest(),
                        getAllRequest({
				middlewares: [
					timed({ label: "get-on-sale" }),
					...mongoBlock({
						operation: "query",
						filter: {
							onSale: true,
							stock: { $gt: 0 }, // Solo con stock disponible
						},
						options: {
							sort: { discount: -1 }, // Mayor descuento primero
							limit: 20,
						},
						includeInfo: true,
					}),
				],
			}),
			populateArray(), // Sobrescribir array con productos en oferta
		],

		// 🔎 Búsqueda por texto completo
                search: [
                        logRequest(),
                        getAllRequest({
				middlewares: [
					timed({ label: "text-search" }),
					dbConnect(),
					mongoQuery({
						operation: "find",
						filter: {
							$text: { $search: "$query" }, // $query viene de los parámetros
						},
						options: {
							// Ordenar por relevancia de texto
							score: { $meta: "textScore" },
							sort: { score: { $meta: "textScore" } },
							limit: 30,
						},
					}),
				],
			}),
			populateArray(), // Sobrescribir array con resultados de búsqueda
		],

		// 📊 Obtener estadísticas básicas
                getStats: [
                        logRequest(),
                        getAllRequest({
				middlewares: [
					timed({ label: "get-stats" }),
					...mongoBlock({
						operation: "query",
						includeInfo: true,
					}),
				],
			}),
			populateArray(), // Sobrescribir con datos completos
		],

		// 📈 Productos más caros
                getMostExpensive: [
                        logRequest(),
                        getAllRequest({
				middlewares: [
					...mongoBlock({
						operation: "query",
						options: {
							sort: { price: -1 },
							limit: 10,
						},
						includeInfo: false,
					}),
				],
			}),
			populateArray(), // Sobrescribir con productos más caros
		],

		// 🆕 Productos recientes (últimos 30 días)
                getRecent: [
                        logRequest(),
                        getAllRequest({
				middlewares: [
					timed({ label: "get-recent" }),
					mongoQuery({
						operation: "find",
						filter: {
							createdAt: {
								$gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
							},
						},
						options: {
							sort: { createdAt: -1 },
							limit: 15,
						},
					}),
				],
			}),
			populateArray(), // Sobrescribir con productos recientes
		],

		// 🏭 Productos por proveedor
                getBySupplier: [
                        logRequest(),
                        getAllRequest({
				middlewares: [
					mongoQuery({
						operation: "find",
						filter: { supplierEmail: "$email" }, // $email de los parámetros
						options: { sort: { name: 1 } },
					}),
				],
			}),
			populateArray(), // Sobrescribir con productos del proveedor
		],

		// 🔢 Actualizar stock (usando middleware estándar)
                updateStock: [
                        logRequest(),
                        putRequest({
				middlewares: [
					timed({ label: "update-stock" }),
					rateLimit({ maxRequests: 5, windowMs: 60000 }),
					mongoUpdate({
						filter: { _id: "$productId" },
						upsert: false,
					}),
				],
			}),
		],
	}
)
export class Producto {
	// ======= AUTO-GENERACIÓN DE SCHEMA MONGOOSE =======
	// Los decorators se convierten automáticamente en configuración de schema

	// 🆔 ID único (se mapea a _id en MongoDB)
	@Required()
	id?: string; // MongoDB generará automáticamente el ObjectId

	// 📛 Nombre del producto
	@Required({ message: "El nombre del producto es obligatorio" })
	@NotEmpty({ message: "El nombre no puede estar vacío" })
	@Trim()
	@MaxLength(255, { message: "El nombre es demasiado largo" })
	name: string = ""; // String, required, trimmed, max 255 chars

	// 🔗 Slug para URLs amigables
	@Trim()
	@Slugify()
	@MaxLength(300)
	slug?: string; // String, auto-slugified, indexed uniquely

	// 📝 Descripción del producto
	@Trim()
	@MaxLength(2000, { message: "Descripción demasiado larga" })
	description?: string; // String, trimmed, max 2000 chars

	// 🏷️ Categoría del producto
	@Required({ message: "La categoría es requerida" })
	@Trim()
	@MaxLength(100)
	category: string = ""; // String, required, indexed

	// 💰 Precio del producto
	@IsPositive({ message: "El precio debe ser positivo" })
	price?: number; // Number, must be positive

	// 🏷️ Si está en oferta
	onSale?: boolean; // Boolean, default false

	// 📉 Descuento (porcentaje)
	discount?: number; // Number, percentage

	// 📦 Stock disponible
	@IsPositive({ message: "El stock no puede ser negativo" })
	stock?: number; // Number, must be positive

	// 📧 Email del proveedor
	@Email({ message: "Formato de email inválido" })
	@Trim()
	supplierEmail?: string; // String, validated email format

	// 🏭 Fecha de fabricación (debe ser en el pasado)
	@PastDate({ message: "La fecha de fabricación debe ser en el pasado" })
	manufacturingDate?: Date; // Date, must be past

	// 🏷️ Tags/etiquetas del producto
	tags?: string[]; // Array de strings

	// MongoDB agregará automáticamente:
	// - _id (ObjectId) - ID único
	// - createdAt (Date) - Fecha de creación automática
	// - updatedAt (Date) - Fecha de actualización automática
	// - __v se deshabilita
	// + Todos los índices definidos en el script de inicialización
}
