# 🍃 MongoDB Integration con Nuxt-Modelator

## 📋 **Características**

✅ **Auto-generación de Schemas de Mongoose** - Los decorators se convierten automáticamente en configuración de schema  
✅ **Conexión automática** - Solo configura `dbConfig` y el sistema se conecta automáticamente  
✅ **Middlewares CRUD completos** - `mongoQuery`, `mongoSave`, `mongoUpdate`, `mongoDelete`, `mongoSaveOrUpdate`  
✅ **Compatibilidad total** - Funciona junto a otros sistemas de DB  
✅ **Composición verdadera** - Timing, auth, validación, todo con `next()`  
✅ **Validación de decorators** - Los validators se aplican también en MongoDB

## 🚀 **Instalación**

```bash
npm install mongoose @types/mongoose
```

## ⚙️ **Configuración Básica**

### 1. Configurar MongoDB en tu Modelo

```typescript
@Model(
	{
		enableList: true,
		plural: "productos",
		basePath: "/api",
		// ✨ CONFIGURACIÓN DE MONGODB
		dbConfig: {
			type: "mongo",
			connectionURI: "mongodb://localhost:27017/tu-database",
			options: {
				dbName: "tu-database",
				maxPoolSize: 10,
				minPoolSize: 5,
				maxIdleTimeMS: 30000,
				serverSelectionTimeoutMS: 5000,
			},
		},
	},
	{
		// Los middlewares se adaptan automáticamente
		create: [mongoSave()],
		getAll: [mongoQuery()],
		// ... resto de operaciones
	}
)
export class Producto {
        @Id()
        id?: string;

	@Required()
	@NotEmpty()
	@Trim()
	name!: string;

	// ... resto de propiedades
}
```

## 🎯 **Auto-generación de Schema**

Los **decorators** se convierten automáticamente en configuración de Mongoose:

| Decorator          | Schema Mongoose                                |
| ------------------ | ---------------------------------------------- |
| `@Required()`      | `{ required: true }`                           |
| `@Id()`            | `{ type: ObjectId }`                           |
| `@Email()`         | `{ type: String, validate: emailValidator }`   |
| `@UUID()`          | `{ type: String }`                             |
| `@Url()`           | `{ type: String }`                             |
| `@NumericString()` | `{ type: String, validate: numericValidator }` |
| `@DateISO()`       | `{ type: Date }`                               |
| `@Trim()`          | `{ type: String, transform: trimFunction }`    |
| `@Slugify()`       | `{ type: String, transform: slugifyFunction }` |
| `@Unique()`        | `{ unique: true }`                             |
| `@PastDate()`      | `{ type: Date }`                               |
| `@FutureDate()`    | `{ type: Date }`                               |

### Schema Generado Automáticamente:

```javascript
// Schema auto-generado para el ejemplo anterior:
{
	_id: { type: ObjectId, required: true },
	name: {
		type: String,
		required: true,
		transform: (v) => v?.trim()
	},
	email: {
		type: String,
		validate: {
			validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
			message: 'Invalid email format'
		}
	}
	// + timestamps: true (createdAt, updatedAt automáticos)
	// + versionKey: false (sin __v)
	// + collection: "productos" (usa el plural)
}
```

## 🛠️ **Middlewares MongoDB**

### **Operaciones CRUD Básicas**

```typescript
{
	// CREATE
	create: [
		timed({ label: "create-product" }),
		mongoSave({ operation: "create" })
	],

	// READ ONE
	get: [
		mongoQuery({
			operation: "findOne",
			filter: { _id: "$id" }
		})
	],

	// READ MANY
	getAll: [
		mongoQuery({
			operation: "find",
			options: {
				limit: 100,
				sort: { createdAt: -1 }
			}
		})
	],

	// UPDATE
	update: [
		mongoUpdate({
			filter: { _id: "$id" },
			upsert: false
		})
	],

	// DELETE
	delete: [
		mongoDelete({
			filter: { _id: "$id" },
			confirmDeletion: true
		})
	],

	// SAVE OR UPDATE (UPSERT)
	saveOrUpdate: [
		mongoSaveOrUpdate() // Auto-detecta por _id
	]
}
```

### **Helpers de Alto Nivel**

```typescript
// Helper para CRUD completo
...mongoCrudBlock("create")  // → [dbConnect(), mongoSave()]
...mongoCrudBlock("read")    // → [dbConnect(), mongoQuery()]
...mongoCrudBlock("update")  // → [dbConnect(), mongoUpdate()]
...mongoCrudBlock("delete")  // → [dbConnect(), mongoDelete()]

// Helper personalizable
...mongoBlock({
	operation: "query",
	filter: { category: "electronics" },
	options: { limit: 50, sort: { price: 1 } },
	includeInfo: true
})
```

### **Métodos Personalizados**

```typescript
{
	// Buscar por categoría
	getByCategory: [
		mongoQuery({
			operation: "find",
			filter: { category: "$category" },
			options: { sort: { name: 1 } }
		})
	],

	// Productos en oferta con stock
	getOnSale: [
		mongoQuery({
			operation: "find",
			filter: {
				onSale: true,
				stock: { $gt: 0 }
			},
			options: {
				sort: { discount: -1 },
				populate: ["supplier"],
				limit: 50
			}
		})
	],

	// Búsqueda con texto
	search: [
		mongoQuery({
			operation: "find",
			filter: {
				$text: { $search: "$query" }
			},
			options: {
				score: { $meta: "textScore" },
				sort: { score: { $meta: "textScore" } }
			}
		})
	]
}
```

## 🔧 **Composición Avanzada**

```typescript
{
	create: [
		// ⏱️ Timing de toda la operación
		timed({ label: "product-creation", threshold: 1000 }),

		// 🔐 Autenticación y autorización
		...authBlock({
			roles: { admin: true },
			permissions: ["product:create"],
		}),

		// 📊 Rate limiting
		rateLimit({
			maxRequests: 10,
			windowMs: 60000,
		}),

		// 🗄️ MongoDB: Crear documento
		mongoSave({ operation: "create" }),

		// 📨 Post-procesamiento
		async (ctx, next) => {
			// El documento se guarda en ctx.state.data
			const product = ctx.state.data;
			console.log("Producto creado:", product._id);
			await next();
		},
	];
}
```

## 🎪 **Características Avanzadas**

### **1. Populate Automático**

```typescript
mongoQuery({
	operation: "find",
	filter: { category: "electronics" },
	options: {
		populate: ["supplier", "reviews.user"],
	},
});
```

### **2. Agregaciones MongoDB**

```typescript
// Custom middleware para agregaciones complejas
const aggregateMiddleware = () => async (ctx, next) => {
	if (ctx.state.db?.type !== "mongo") return next();

	const model = await getOrCreateMongoModel(ctx.state.modelMeta);

	const result = await model.aggregate([
		{ $match: { category: ctx.args.category } },
		{
			$group: {
				_id: "$supplier",
				count: { $sum: 1 },
				avgPrice: { $avg: "$price" },
			},
		},
		{ $sort: { count: -1 } },
	]);

	ctx.state.data = result;
	await next();
};
```

### **3. Transacciones**

```typescript
{
	complexOperation: [
		dbConnect(),

		// Iniciar transacción
		async (ctx, next) => {
			const session = await mongoose.startSession();
			session.startTransaction();
			ctx.state.session = session;

			try {
				await next();
				await session.commitTransaction();
			} catch (error) {
				await session.abortTransaction();
				throw error;
			} finally {
				await session.endSession();
			}
		},

		// Operaciones dentro de la transacción
		mongoSave({ operation: "create" }),

		async (ctx, next) => {
			// Otra operación relacionada
			await next();
		},
	];
}
```

## 🔍 **Debugging y Monitoreo**

```typescript
{
	getAll: [
		mongoInfo(), // Agrega info de conexión al response

		debug({
			logState: true,
			logTiming: true,
		}),

		mongoQuery({
			operation: "find",
			options: { limit: 100 },
		}),
	];
}
```

### **Estado del Context**

Después de ejecutar middlewares MongoDB, el contexto contiene:

```typescript
ctx.state = {
	db: {
		connected: true,
		type: "mongo",
		connectionInfo: { ... },
		connectedAt: "2023-12-01T10:00:00.000Z"
	},
	mongoResult: {
		success: true,
		data: [...], // Los documentos encontrados/creados
		count: 5
	},
	data: [...], // Shortcut a mongoResult.data
	modelMeta: { ... } // Metadata del modelo
}
```

## 🚨 **Manejo de Errores**

```typescript
{
	create: [
		mongoSave({ operation: "create" }),

		// Middleware de manejo de errores
		async (ctx, next) => {
			try {
				await next();
			} catch (error) {
				if (error.code === 11000) {
					// Duplicate key
					return ctx.done({
						status: 409,
						message: "El producto ya existe",
					});
				}
				throw error;
			}
		},
	];
}
```

## 🌟 **Compatibilidad**

### **Multi-Database**

```typescript
// Modelo con MongoDB
@Model({
	dbConfig: { type: "mongo", connectionURI: "..." }
}, { ... })
class ProductoMongo { ... }

// Modelo con PostgreSQL (futuro)
@Model({
	dbConfig: { type: "postgres", connectionURI: "..." }
}, { ... })
class ProductoPostgres { ... }

// Modelo sin DB específica (genérico)
@Model({}, {
	create: [dbConnect(), /* operaciones genéricas */]
})
class ProductoGenerico { ... }
```

### **Migración Gradual**

```typescript
// Migración paso a paso
@Model({
	// Agregar dbConfig sin cambiar middlewares
	dbConfig: { type: "mongo", connectionURI: "..." }
}, {
	// Los middlewares existentes siguen funcionando
	create: [dbConnect(), /* middlewares actuales */]

	// Agregar métodos con MongoDB gradualmente
	createMongo: [...mongoCrudBlock("create")]
})
```

## 🎯 **Ejemplos Completos**

Ver archivo de ejemplo: `nuxt-modelator-example/domain/models/ProductoMongo.ts`

## 📚 **API Reference**

### **Middlewares Disponibles:**

-   `mongoQuery(config?)` - Consultas find/findOne
-   `mongoSave(config?)` - Crear documentos
-   `mongoUpdate(config?)` - Actualizar documentos
-   `mongoDelete(config?)` - Eliminar documentos
-   `mongoSaveOrUpdate(config?)` - Upsert (crear o actualizar)
-   `mongoInfo()` - Información de conexión

### **Helpers de Bloques:**

-   `mongoCrudBlock(operation, options?)` - CRUD completo
-   `mongoBlock(config)` - Bloque personalizable
-   `authBlock(config?)` - Autenticación + autorización
-   `timedBlock(label, middlewares)` - Timing de un bloque

¡La integración de MongoDB está lista! 🚀
