# nuxt-modelator

`nuxt-modelator` es un módulo para Nuxt 3 que genera endpoints, tiendas de Pinia y ejecutores de middlewares a partir de modelos definidos con decoradores.

## Instalación

```bash
npm install nuxt-modelator
# o
pnpm add nuxt-modelator
```

En `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-modelator'],
  modelator: {
    modelsDir: 'domain/models',
    inspector: true
  }
});
```

## Qué resuelve

- Centraliza la definición del dominio mediante modelos.
- Genera automáticamente endpoints REST y tiendas de estado.
- Permite componer middlewares reutilizables tanto en cliente como en servidor.

## Parte técnica

### Validadores

#### Generales
- `@Required()` – obliga a que exista un valor.
- `@MaxLength(max)` / `@MinLength(min)` / `@Length({min,max})` – control de longitud.
- `@NotEmpty()` – cadenas o arreglos no vacíos.

#### Cadenas
- `@Email()` – valida formato de correo.
- `@Pattern(/regex/)` – coincide con expresión regular.
- `@UUID()`, `@Url()`, `@NumericString()`, `@DateISO()`.

#### Números
- `@Max(valor)` / `@Min(valor)` / `@Range({min,max})`.
- `@IsPositive()` / `@IsNegative()`.

#### Fechas
- `@PastDate()` / `@FutureDate()` / `@Today()`.

**Ejemplo:**

```ts
import { Email, Required, MaxLength, ToLowerCase } from 'nuxt-modelator/dist/decorators';

class User {
  @Required()
  @Email()
  @MaxLength(100)
  @ToLowerCase()
  email!: string;
}
```

### Transformadores

Todos operan sobre cadenas:
- `@ToLowerCase()`, `@ToUpperCase()`, `@Trim()`, `@Capitalize()`.
- `@Slugify()`, `@Base64()`, `@UrlEncode()`.
- `@SanitizeHtml()`, `@EscapeHtml()`.

### Middlewares

Los middlewares se describen con helpers que devuelven un `MiddlewareSpec` y pueden encadenarse para crear flujos complejos. A continuación se listan los principales agrupados por entorno.

#### Servidor
- `isAuth()`
  - Falla con 401 si no existe una sesión válida en `event.context`.
- `sessionHasProperty({ roles?, permissions? })`
  - Autoriza según los roles o permisos presentes en la sesión.
- `timed({ label?, threshold?, logResults? })`
  - Mide la duración de la operación. `threshold` permite registrar solo cuando se supera cierto tiempo.
- `dbConnect({ connectionString?, dbConfig? })`
  - Abre la conexión a la base de datos indicada en el modelo; puede sobreescribirse.
- `transaction({ isolationLevel? })`
  - Envuelve el bloque siguiente en una transacción.
- Mongo helpers:
  - `mongoQuery({ operation, filter, options })` – ejecuta operaciones `find`, `findOne`, `aggregate`, etc.
  - `mongoSave({ document })`, `mongoUpdate({ filter, update, options })`, `mongoDelete({ filter })` – operaciones CRUD.
  - `mongoSaveOrUpdate()` decide entre guardar o actualizar según exista `_id`.
  - `mongoInfo()` añade datos de la conexión al contexto.

#### Cliente
- `saveOnStore({ to = 'single', position = 'push' })`
  - Persiste el resultado en la tienda de Pinia especificada.
- `populateArray({ from = 'data' })`
  - Sobrescribe un arreglo del estado con el contenido recibido.
- `getFromPluralFiltered(filter)`
  - Obtiene elementos de la colección `plural` aplicando un filtro.
- `addToPlural({ position = 'push', to = 'plural' })`
  - Inserta el elemento devuelto en la colección local.
- Peticiones HTTP: `postRequest`, `postAllRequest`, `getRequest`, `getAllRequest`, `putRequest`, `putAllRequest`, `deleteRequest`, `deleteAllRequest`
  - Aceptan `{ url, headers, method, baseUrl, bodyMapper, middlewares }`; los `middlewares` internos se ejecutan en el servidor.
- `cache({ ttl = 0, key?, storage? })`
  - Cachea respuestas en memoria, `localStorage` o `sessionStorage`.

#### Híbridos
Se ejecutan tanto en cliente como en servidor.
- `rateLimit({ maxRequests, windowMs, keyGenerator?, skipSuccessful? })`
  - Limita la cantidad de llamadas permitidas en un período.
- `debug({ logState?, logArgs?, logTiming?, prefix? })`
  - Imprime información útil para depuración.
- `run(fn, { after = false })`
  - Ejecuta una función antes o después de la cadena de middlewares.
- `catch(fn)`
  - Permite manejar errores de la cadena.
- `throttle(wait, { defaultValue? })` y `debounce(wait)`
  - Controlan la frecuencia de ejecución.
- `retryable(retries)`
  - Reintenta la operación la cantidad indicada.
- `cacheable({ ttl, middlewares? })`
  - Almacena el resultado en caché mientras ejecuta middlewares internos opcionales.
- `circuitBreaker({ failureThreshold, successThreshold, timeout, resetTimeout, fallback? })`
  - Abre o cierra el circuito según la tasa de fallos.
- `logRequest({ logLevel = 'info', includeArgs = false, includeState = false })`
  - Registra en consola las peticiones y su contexto.

#### Ejemplo con modelos

```ts
// nuxt-modelator-example/domain/models/PlaceholderPost.ts
import 'reflect-metadata'
import { Model } from 'nuxt-modelator/dist/decorators'
import { logRequest, run, getAllRequest } from 'nuxt-modelator/dist/middlewares'

const limitFive = (ctx: any) => {
  const data = ctx.args?.data
  if (Array.isArray(data)) {
    ctx.args.data = data.slice(0, 5)
  }
}

@Model(
  {
    basePath: '/api',
    plural: 'placeholderPosts',
    enableList: true,
  },
  {
    getAll: [
      logRequest(),
      run(limitFive, { after: true }),
      getAllRequest({
        url: 'https://jsonplaceholder.typicode.com/posts',
      }),
    ],
  }
)
export class PlaceholderPost {
  id!: number
  title!: string
  body!: string
}
```

Este archivo vive en `nuxt-modelator-example/domain/models`, la ruta que debe configurarse en `modelsDir` para que el módulo cargue automáticamente los modelos.

## Ejemplo

El repositorio incluye `nuxt-modelator-example` que muestra un uso completo del módulo.

## Licencia

MIT

