# 🍃 Nuxt-Modelator + MongoDB Demo

Demo completo que muestra las capacidades de **nuxt-modelator** con integración nativa de MongoDB, auto-generación de schemas, y composición verdadera de middlewares.

## ✨ Características Demostradas

-   🍃 **MongoDB Integration** - Conexión automática y schemas generados desde decorators TypeScript
-   ⚡ **True Composition** - Middlewares con `next()` real para timing, rate limiting, auth
-   🔍 **Full-Text Search** - Búsqueda de texto completo con índices optimizados de MongoDB
-   📊 **Real-time CRUD** - Operaciones create, read, update, delete con validación automática
-   🎯 **Auto-Generated Endpoints** - APIs REST generadas automáticamente desde el modelo
-   🛡️ **Built-in Protection** - Rate limiting, validación, error handling automático
-   🎪 **Advanced Queries** - Filtros, agregaciones, consultas personalizadas con MongoDB

## 🚀 Inicio Rápido

### 1. Levantar MongoDB con Docker

```bash
# Desde el directorio del ejemplo
docker-compose up -d

# Verificar que está funcionando
docker-compose ps
```

Esto creará:

-   **MongoDB** en `localhost:27018`
-   **Mongo Express** (admin UI) en `http://localhost:8081`
    -   Usuario: `admin` / Contraseña: `admin123`
-   **Datos de ejemplo** automáticamente insertados

### 2. Instalar dependencias

```bash
# Instalar dependencias del ejemplo
npm install

# Build nuxt-modelator desde la raíz del monorepo
cd ../nuxt-modelator
npm run build
cd ../nuxt-modelator-example
```

### 3. Ejecutar el demo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y explora la demo!

## 🎯 Qué puedes probar

### 📦 **Tab: Productos**

-   **Recargar Todo**: Obtiene todos los productos con timing automático
-   **Solo Ofertas**: Filtra productos en oferta usando consultas MongoDB optimizadas
-   Ver productos con información completa: precio, stock, categorías, descuentos

### ➕ **Tab: Crear**

-   **Crear Producto Válido**: Prueba la validación y transformación automática
    -   `@Trim()` elimina espacios en blanco
    -   `@Required()` valida campos obligatorios
    -   `@IsPositive()` valida números positivos
    -   `@Email()` valida formato de email
-   **Probar Validaciones**: Intenta crear un producto inválido para ver errores
    -   Nombres vacíos
    -   Descripciones muy largas (>2000 chars)
    -   Precios negativos
    -   Emails con formato incorrecto
    -   Fechas futuras cuando se requieren pasadas

### 🔍 **Tab: Búsqueda**

-   **Búsqueda por Texto**: Utiliza el índice de texto completo de MongoDB
    -   Busca en nombre, descripción, categoría y tags
    -   Ordenado por relevancia automáticamente
-   **Filtrar por Categoría**: Consultas optimizadas con índices
    -   Filtrado rápido por categorías específicas

## 📊 Modelo: Producto.ts

El modelo demuestra todas las características de nuxt-modelator:

```typescript
@Model(
	{
		// ✨ CONFIGURACIÓN DE MONGODB
		dbConfig: {
			type: "mongo",
			connectionURI: "mongodb://nuxt-app:nuxt-app-123@localhost:27018/nuxt-modelator-demo",
		},
	},
	{
		// ⚡ ENDPOINTS CON COMPOSICIÓN VERDADERA
		create: [
			timed({ label: "create-product" }), // 🔄 Timing que envuelve TODO
			rateLimit({ maxRequests: 5 }), // 🛡️ Rate limiting antes de ejecutar
			...mongoCrudBlock("create"), // 🍃 MongoDB create con validación
		],

		getAll: [timed({ label: "get-all" }), mongoQuery({ options: { limit: 50, sort: { createdAt: -1 } } })],

		search: [
			mongoQuery({
				filter: { $text: { $search: "$query" } },
				options: { score: { $meta: "textScore" } },
			}),
		],

		getByCategory: [
			mongoQuery({
				filter: { category: "$category" },
				options: { sort: { name: 1 } },
			}),
		],

		getOnSale: [
			mongoQuery({
				filter: { onSale: true, stock: { $gt: 0 } },
				options: { sort: { discount: -1 } },
			}),
		],
	}
)
export class Producto {
	@Required()
	@NotEmpty()
	@Trim()
	@MaxLength(255)
	name!: string; // → { type: String, required: true, trim: true, maxLength: 255 }

	@Email()
	@Trim()
	supplierEmail?: string; // → { type: String, validate: emailValidator }

	@PastDate()
	manufacturingDate?: Date; // → { type: Date, validate: pastValidator }

	@IsPositive()
	price?: number; // → { type: Number, validate: positiveValidator }

	// MongoDB agrega automáticamente:
	// - _id (ObjectId)
	// - createdAt, updatedAt (timestamps)
	// - Índices optimizados
	// - Colección "productos"
}
```

## 🗄️ Base de Datos

### Datos de Ejemplo Incluidos

El script de inicialización (`mongo-init/01-init.js`) crea:

-   ✅ **5 productos** de diferentes categorías (Laptops, Smartphones, Audio, Tablets)
-   ✅ **Índices optimizados** para consultas rápidas
-   ✅ **Índice de texto completo** para búsquedas
-   ✅ **Usuario de aplicación** con permisos apropiados

### Productos de Ejemplo:

-   MacBook Pro M3 (Laptops) - $2,499.99
-   Samsung Galaxy S24 (Smartphones) - $899.99 (15% OFF)
-   Sony WH-1000XM5 (Audio) - $349.99 (20% OFF)
-   Dell XPS 13 (Laptops) - $1,299.99
-   iPad Air M2 (Tablets) - $699.99 (10% OFF)

### Acceso a MongoDB

-   **Mongo Express**: http://localhost:8081 (admin/admin123)
-   **Conexión directa**: `mongodb://nuxt-app:nuxt-app-123@localhost:27018/nuxt-modelator-demo`

## 🎪 Características Avanzadas

### 🔄 **True Composition**

```typescript
create: [
	timed({ label: "timing-wrapper" }), // Envuelve TODA la operación
	rateLimit({ maxRequests: 5 }), // Solo ejecuta si pasa el timing
	mongoSave({ operation: "create" }), // Solo ejecuta si pasa rate limit
];
```

### 🍃 **Auto-Schema Generation**

Los decorators TypeScript se convierten automáticamente en configuración de Mongoose:

-   `@Required()` → `{ required: true }`
-   `@Email()` → `{ type: String, validate: emailValidator }`
-   `@Trim()` → `{ type: String, transform: trimFunction }`
-   `@PastDate()` → `{ type: Date, validate: pastValidator }`

### ⚡ **Performance & Monitoring**

-   Connection pooling automático (5-10 conexiones)
-   Rate limiting configurable por endpoint
-   Timing automático de todas las operaciones
-   Logging de estado y debug automático
-   Índices optimizados para consultas frecuentes

### 🎯 **Endpoints Auto-Generados**

```
GET    /api/productos         → getAll
GET    /api/productos/{id}    → get
POST   /api/productos         → create
PUT    /api/productos/{id}    → update
DELETE /api/productos/{id}    → delete
POST   /api/productos/search  → search
POST   /api/productos/by-category → getByCategory
POST   /api/productos/on-sale → getOnSale
```

## 🛠️ Desarrollo

### Estructura de Archivos

```
nuxt-modelator-example/
├── domain/models/
│   └── Producto.ts           # Modelo con MongoDB config
├── pages/
│   └── index.vue            # Demo UI
├── docker-compose.yml        # MongoDB setup
├── mongo-init/
│   └── 01-init.js           # Datos de ejemplo
└── nuxt.config.ts           # Configuración Nuxt + modelator
```

### Logs y Debug

Abre la **consola del navegador** para ver:

-   ⏱️ Timing detallado de operaciones
-   🔄 Estado de middlewares en cada paso
-   🍃 Información de conexión MongoDB
-   🛡️ Rate limiting y debug automático

### Personalización

1. **Cambiar datos de conexión**: Edita `docker-compose.yml`
2. **Agregar middlewares**: Crea archivos en `/middlewares/server/`
3. **Nuevos validators**: Agrega en `/validators/`
4. **Modify UI**: Edita `pages/index.vue`

## 🚨 Troubleshooting

### MongoDB no conecta

```bash
# Verificar contenedores
docker-compose ps

# Ver logs de MongoDB
docker-compose logs mongodb

# Reiniciar servicios
docker-compose down && docker-compose up -d
```

### Store no encontrado

```bash
# Rebuild nuxt-modelator
cd ../nuxt-modelator
npm run build
cd ../nuxt-modelator-example

# Limpiar cache de Nuxt
rm -rf .nuxt
npm run dev
```

### Errores de validación

-   Verificar que MongoDB esté corriendo
-   Comprobar formato de datos en consola del navegador
-   Revisar errores de red en DevTools

## 🌟 Next Steps

-   Agrega autenticación con `authBlock({ roles: { admin: true } })`
-   Implementa paginación avanzada
-   Crea agregaciones personalizadas con pipelines MongoDB
-   Añade relaciones entre modelos
-   Integra con otras bases de datos (PostgreSQL, MySQL)

¡Explora y diviértete con nuxt-modelator! 🚀
