<script setup lang="ts">
import { computed } from 'vue'
import { useProductoStore } from '#nuxt-modelator/stores/useProductoStore'
import StatsCard from '../molecules/StatsCard.vue'

const store = useProductoStore()
const categories = computed(() => {
  const cats = new Set<string>()
  if (Array.isArray(store.all)) {
    store.all.forEach((product: any) => {
      if (product?.category) cats.add(product.category)
    })
  }
  return Array.from(cats)
})

const totalProducts = computed(() => Array.isArray(store.all) ? store.all.length : 0)
const productsOnSale = computed(() => {
  if (!Array.isArray(store.all)) return []
  return store.all.filter(p => p && p.onSale === true)
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <StatsCard icon="📦" label="Total Productos" :value="totalProducts" border-color="border-blue-500" icon-bg="bg-blue-100" text-color="text-blue-600" />
    <StatsCard icon="💰" label="En Oferta" :value="productsOnSale.length" border-color="border-green-500" icon-bg="bg-green-100" text-color="text-green-600" />
    <StatsCard icon="🏷️" label="Categorías" :value="categories.length" border-color="border-purple-500" icon-bg="bg-purple-100" text-color="text-purple-600" />
  </div>
</template>
