# nuxt-modelator

Monorepo que alberga el módulo `nuxt-modelator` y un proyecto de ejemplo basado en Nuxt 3.

`nuxt-modelator` permite describir tu dominio con modelos TypeScript y, a partir de ellos, generar endpoints REST, stores de Pinia, esquemas de BDs y ejecutar cadenas de middlewares reutilizables.

## Contenido del repositorio

-   `nuxt-modelator/` – código fuente del módulo.
-   `nuxt-modelator-example/` – aplicación Nuxt que demuestra su uso. Sus modelos viven en `domain/models`.

## Instalación rápida

```bash
npm install nuxt-modelator
# o
pnpm add nuxt-modelator
```

En `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
	modules: ["nuxt-modelator"],
	modelator: {
		modelsDir: "domain/models", // ruta donde se colocan los modelos
	},
});
```

## Propósito

-   Centralizar la lógica de dominio en modelos.
-   Evitar repetición al generar endpoints y estado.
-   Componer middlewares que funcionan tanto en cliente como en servidor.

Para ver un ejemplo funcional revisa `nuxt-modelator-example` y ejecuta `pnpm install && pnpm dev` dentro de esa carpeta.

## Licencia

MIT
