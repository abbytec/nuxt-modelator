# nuxt-modelator

[Leer en español](README.es.md)

`nuxt-modelator` is a module for Nuxt 3 that generates endpoints, Pinia stores, integrates them with middleware executors and database schemas, all from the models defined with the described decorators and middlewares.

## Installation

```bash
npm install nuxt-modelator
# or
pnpm add nuxt-modelator
```

In `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
	modules: ["nuxt-modelator"],
	modelator: {
		modelsDir: "domain/models",
		inspector: true,
	},
});
```

## What it solves

-   Centralizes domain definition through models.
-   Automatically generates REST endpoints and state stores.
-   Lets you compose reusable middlewares for client and server.

## Technical reference

### Validators

#### General

-   `@Required()` – requires a value.
-   `@MaxLength(max)` / `@MinLength(min)` / `@Length({ min, max })` – control string or array length.
-   `@NotEmpty()` – ensures string or array is not empty.

#### Strings

-   `@Email()` – checks email format.
-   `@Pattern(/regex/)` – matches a regular expression.
-   `@UUID()`, `@Url()`, `@NumericString()`, `@DateISO()`.

#### Numbers

-   `@Max(value)` / `@Min(value)` / `@Range({ min, max })`.
-   `@IsPositive()` / `@IsNegative()`.

#### Dates

-   `@PastDate()` / `@FutureDate()` / `@Today()`.

**Example:**

```ts
import { Email, Required, MaxLength, ToLowerCase } from "nuxt-modelator/dist/decorators";

class User {
	@Required()
	@Email()
	@MaxLength(100)
	@ToLowerCase()
	email!: string;
}
```

### Transformers

All operate on strings:

-   `@ToLowerCase()`, `@ToUpperCase()`, `@Trim()`, `@Capitalize()`.
-   `@Slugify()`, `@Base64()`, `@UrlEncode()`.
-   `@SanitizeHtml()`, `@EscapeHtml()`.

### Middlewares

Middlewares are described with helpers that return a `MiddlewareSpec` and can be chained to build complex flows. Below are the main ones grouped by environment.

#### Server

-   `isAuth()`
    -   Throws 401 if `event.context` lacks a valid session.
-   `sessionHasProperty({ roles?, permissions? })`
    -   Authorizes based on roles or permissions present in the session.
-   `timed({ label?, threshold?, logResults? })`
    -   Measures execution time. `threshold` controls when to log.
-   `dbConnect({ connectionString?, dbConfig? })`
    -   Opens the database connection defined on the model; can be overridden.
-   `transaction({ isolationLevel? })`
    -   Wraps the following block in a transaction.
-   Mongo helpers:
    -   `mongoQuery({ operation, filter, options })` – run `find`, `findOne`, `aggregate`, etc.
    -   `mongoSave({ document })`, `mongoUpdate({ filter, update, options })`, `mongoDelete({ filter })` – CRUD operations.
    -   `mongoSaveOrUpdate()` chooses between save or update depending on `_id`.
    -   `mongoInfo()` adds connection metadata to the context.

#### Client

-   `saveOnStore({ to = 'single', position = 'push' })`
    -   Persists the result in the specified Pinia store.
-   `populateArray({ from = 'data' })`
    -   Replaces an array in state with received data.
-   `getFromPluralFiltered(filter)`
    -   Retrieves items from the `plural` collection applying a filter.
-   `addToPlural({ position = 'push', to = 'plural' })`
    -   Inserts the returned item into the local collection.
-   HTTP requests: `postRequest`, `postAllRequest`, `getRequest`, `getAllRequest`, `putRequest`, `putAllRequest`, `deleteRequest`, `deleteAllRequest`
    -   Accept `{ url, headers, method, baseUrl, bodyMapper, middlewares }`; the inner `middlewares` run on the server.
-   `cache({ ttl = 0, key?, storage? })`
    -   Caches responses in memory, `localStorage`, or `sessionStorage`.

#### Hybrid

Run on both client and server.

-   `rateLimit({ maxRequests, windowMs, keyGenerator?, skipSuccessful? })`
    -   Limits the number of allowed calls in a period.
-   `debug({ logState?, logArgs?, logTiming?, prefix? })`
    -   Logs helpful debugging information.
-   `run(fn, { after = false })`
    -   Executes a function before or after the middleware chain.
-   `catch(fn)`
    -   Handles chain errors.
-   `throttle(wait, { defaultValue? })` and `debounce(wait)`
    -   Control execution frequency.
-   `retryable(retries)`
    -   Retries the operation the given number of times.
-   `cacheable({ ttl, middlewares? })`
    -   Stores the result in cache while optionally running inner middlewares.
-   `circuitBreaker({ failureThreshold, successThreshold, timeout, resetTimeout, fallback? })`
    -   Opens or closes the circuit based on failure rate.
-   `logRequest({ logLevel = 'info', includeArgs = false, includeState = false })`
    -   Logs request and its context.

#### Model-based example

```ts
// nuxt-modelator-example/domain/models/PlaceholderPost.ts
import "reflect-metadata";
import { Model } from "nuxt-modelator/dist/decorators";
import { logRequest, run, getAllRequest } from "nuxt-modelator/dist/middlewares";

const limitFive = (ctx: any) => {
	const data = ctx.args?.data;
	if (Array.isArray(data)) {
		ctx.args.data = data.slice(0, 5);
	}
};

@Model(
	{
		basePath: "/api",
		plural: "placeholderPosts",
		enableList: true,
	},
	{
		getAll: [
			logRequest(),
			run(limitFive, { after: true }),
			getAllRequest({
				url: "https://jsonplaceholder.typicode.com/posts",
			}),
		],
	}
)
export class PlaceholderPost {
	id!: number;
	title!: string;
	body!: string;
}
```

This file lives in `nuxt-modelator-example/domain/models`, the path that should be set in `modelsDir` so the module loads models automatically.

## Example

The repository contains `nuxt-modelator-example` that showcases full module usage.

## License

MIT
