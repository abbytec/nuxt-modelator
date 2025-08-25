# nuxt-modelator

[Lee esto en español](README.es.md)

Monorepo hosting the `nuxt-modelator` module and a Nuxt 3 example project.

`nuxt-modelator` lets you describe your domain with TypeScript models and generates REST endpoints, Pinia stores, and reusable middleware chains.

## Repository contents

- `nuxt-modelator/` – module source code.
- `nuxt-modelator-example/` – Nuxt app demonstrating usage. Its models live in `domain/models`.

## Quick install

```bash
npm install nuxt-modelator
# or
pnpm add nuxt-modelator
```

In `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-modelator'],
  modelator: {
    modelsDir: 'domain/models' // directory where models are placed
  }
})
```

## Purpose

- Centralize domain logic in models.
- Avoid repetition when generating endpoints and state.
- Compose middlewares that work on both client and server.

For a working example check `nuxt-modelator-example` and run `pnpm install && pnpm dev` inside that folder.

## License

MIT
