<script setup lang="ts">
import BaseButton from '../atoms/BaseButton.vue'
import { useProductoStore } from '#nuxt-modelator/stores/useProductoStore'

const props = defineProps<{ product: any }>()
const store = useProductoStore()

const viewDetails = async () => {
  const slug = props.product?.slug || props.product?.name?.toLowerCase()?.replace(/\s+/g, '-')
  await store.getBySlug(slug)
}

const incStock = async () => {
  const id = props.product?._id || props.product?.id
  if (!id) return
  await store.updateStock({ productId: id, data: { $set: { stock: (props.product.stock || 0) + 1 } } })
}

const deleteItem = async () => {
  const id = props.product?._id || props.product?.id
  if (!id) return
  await store.delete(id)
}
</script>

<template>
  <div class="bg-white border rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
    <div class="flex justify-between items-start mb-3">
      <h3 class="font-bold text-lg text-gray-900">{{ props.product.name }}</h3>
      <span v-if="props.product.onSale" class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
        -{{ props.product.discount }}% OFF
      </span>
    </div>
    <p class="text-gray-600 text-sm mb-3">{{ props.product.description }}</p>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-500">Categoría:</span>
        <span class="font-medium">{{ props.product.category }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Precio:</span>
        <span class="font-bold text-green-600">${{ props.product.price }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Stock:</span>
        <span :class="props.product.stock > 10 ? 'text-green-600' : 'text-red-600'">
          {{ props.product.stock || 0 }}
        </span>
      </div>
    </div>

    <div class="flex gap-2 mt-4">
      <BaseButton class="bg-gray-100 text-gray-700 hover:bg-gray-200" @click="viewDetails">👁️ Ver</BaseButton>
      <BaseButton class="bg-amber-500 text-white hover:bg-amber-600" @click="incStock">➕ Stock</BaseButton>
      <BaseButton class="bg-red-600 text-white hover:bg-red-700" @click="deleteItem">🗑️ Eliminar</BaseButton>
    </div>
  </div>
</template>
