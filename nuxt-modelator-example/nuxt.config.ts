import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
	modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss", "nuxt-modelator"],
	modelator: {
		modelsDir: "domain/models",
		inspector: true,
	},
	nitro: { experimental: { openAPI: false } },
	imports: { autoImport: true },
	typescript: { tsConfig: { compilerOptions: { experimentalDecorators: true, emitDecoratorMetadata: true } } },
	css: ["~/assets/css/tailwind.css"],
});
