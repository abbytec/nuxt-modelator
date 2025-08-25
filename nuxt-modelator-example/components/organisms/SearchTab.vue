<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductoStore } from '#nuxt-modelator/stores/useProductoStore'
import SearchBar from '../molecules/SearchBar.vue'
import CategoryFilter from '../molecules/CategoryFilter.vue'

const store = useProductoStore()
const searchQuery = ref('macbook')
const selectedCategory = ref('Laptops')

const categories = computed(() => {
  const cats = new Set<string>()
  if (Array.isArray(store.all)) {
    store.all.forEach((product: any) => {
      if (product?.category) cats.add(product.category)
    })
  }
  return Array.from(cats)
})

const searchProducts = async () => {
  if (!searchQuery.value.trim()) return
  console.log(`🔍 Buscando "${searchQuery.value}"...`)
  try {
    await store.search(searchQuery.value)
  } catch (error) {
    console.error('Error en búsqueda:', error)
  }
}

const getByCategory = async () => {
  if (!selectedCategory.value) return
  console.log(`🏷️ Obteniendo categoría "${selectedCategory.value}"...`)
  try {
    await store.getByCategory(selectedCategory.value)
  } catch (error) {
    console.error('Error obteniendo por categoría:', error)
  }
}

const results = computed(() => {
  if (Array.isArray(store.all) && store.all.length) return store.all
  if (store.entity) return Array.isArray(store.entity) ? store.entity : [store.entity]
  return []
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-blue-50 p-6 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-blue-800">🔍 Búsqueda por Texto</h3>
        <SearchBar v-model="searchQuery" :loading="store.loading.search" @search="searchProducts" />
        <p class="text-sm text-blue-600">💡 Índice de texto completo de MongoDB</p>
      </div>

      <div class="bg-purple-50 p-6 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-purple-800">🏷️ Filtrar por Categoría</h3>
        <CategoryFilter v-model="selectedCategory" :categories="categories" :loading="store.loading.getByCategory" @filter="getByCategory" />
        <p class="text-sm text-purple-600">💡 Consulta optimizada con índices</p>
      </div>
    </div>

    <div v-if="results.length" class="bg-white border rounded-lg p-6">
      <h4 class="font-semibold mb-4">📊 Resultados:</h4>
      <div class="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
        <pre class="text-sm">{{ JSON.stringify(results, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
