<script setup lang="ts">
import BaseButton from '../atoms/BaseButton.vue'
import ProductCard from '../molecules/ProductCard.vue'
import { useProductoStore } from '#nuxt-modelator/stores/useProductoStore'

const store = useProductoStore()

const loadInitialData = async () => {
  try {
    console.time('⏱️ [Demo] Initial data load')
    await store.getAll()
    console.timeEnd('⏱️ [Demo] Initial data load')
  } catch (error) {
    console.error('Error cargando datos iniciales:', error)
  }
}

const getProductsOnSale = async () => {
  console.log('💰 Obteniendo productos en oferta...')
  try {
    await store.getOnSale()
  } catch (error) {
    console.error('Error obteniendo ofertas:', error)
  }
}

const getMostExpensive = async () => {
  try {
    await store.getMostExpensive()
  } catch (error) {
    console.error('Error obteniendo más caros:', error)
  }
}

const getRecent = async () => {
  try {
    await store.getRecent()
  } catch (error) {
    console.error('Error obteniendo recientes:', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap gap-4 mb-6">
      <BaseButton @click="loadInitialData" :disabled="store.loading.getAll" class="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        {{ store.loading.getAll ? '🔄 Cargando...' : '🔄 Recargar Todo' }}
      </BaseButton>
      <BaseButton @click="getProductsOnSale" :disabled="store.loading.getOnSale" class="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
        {{ store.loading.getOnSale ? '💰 Cargando...' : '💰 Solo Ofertas' }}
      </BaseButton>
      <BaseButton @click="getMostExpensive" :disabled="store.loading.getMostExpensive" class="bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
        {{ store.loading.getMostExpensive ? '⏳...' : '💎 Más Caros' }}
      </BaseButton>
      <BaseButton @click="getRecent" :disabled="store.loading.getRecent" class="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
        {{ store.loading.getRecent ? '⏳...' : '🆕 Recientes' }}
      </BaseButton>
    </div>

    <div v-if="Array.isArray(store.all) && store.all.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ProductCard v-for="product in store.all" :key="product._id || product.id" :product="product" />
    </div>

    <div v-else-if="store.loading.getAll" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Cargando productos desde MongoDB...</p>
    </div>

    <div v-else class="text-center py-12 text-gray-500">
      <span class="text-4xl mb-4 block">📦</span>
      <p>No hay productos para mostrar</p>
    </div>
  </div>
</template>
