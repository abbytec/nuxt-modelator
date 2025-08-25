<template>
  <div class="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-8">
    <h3 class="text-xl font-bold mb-6 text-center">🌟 Características de Nuxt-Modelator + MongoDB</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="text-center">
        <div class="text-3xl mb-3">✨</div>
        <h4 class="font-semibold mb-2">Auto-Schema Generation</h4>
        <p class="text-sm text-gray-600">Los decorators TypeScript se convierten automáticamente en schema de Mongoose</p>
      </div>
      <div class="text-center">
        <div class="text-3xl mb-3">⚡</div>
        <h4 class="font-semibold mb-2">True Composition</h4>
        <p class="text-sm text-gray-600">Middlewares con next() real para timing, auth, rate limiting y más</p>
      </div>
      <div class="text-center">
        <div class="text-3xl mb-3">🚀</div>
        <h4 class="font-semibold mb-2">Zero Configuration</h4>
        <p class="text-sm text-gray-600">Solo agrega dbConfig y todo funciona: conexión, endpoints, validación</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
