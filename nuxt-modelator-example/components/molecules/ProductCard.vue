<script setup lang="ts">
const props = defineProps<{ product: any }>()
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
  </div>
</template>
