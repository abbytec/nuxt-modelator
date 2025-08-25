<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useProductoStore } from "#nuxt-modelator/stores/useProductoStore"

const store = useProductoStore()
const products = ref<any[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  products.value = await store.getRecent()
  loading.value = false
})
</script>

<template>
  <div>
    <h2 class="text-xl font-bold mb-2">🆕 Productos recientes</h2>
    <ul v-if="!loading && products.length" class="list-disc ml-5 space-y-1">
      <li v-for="p in products" :key="p.id">
        {{ p.name }} - {{ p.price }}
      </li>
    </ul>
    <p v-else-if="loading">Cargando...</p>
    <p v-else>No hay productos recientes</p>
  </div>
</template>
