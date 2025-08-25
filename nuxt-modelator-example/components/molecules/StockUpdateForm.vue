<script setup lang="ts">
import { ref } from "vue"
import BaseInput from "../atoms/BaseInput.vue"
import BaseButton from "../atoms/BaseButton.vue"
import { useProductoStore } from "#nuxt-modelator/stores/useProductoStore"

const store = useProductoStore()
const productId = ref("")
const stock = ref<number | null>(null)
const message = ref("")

const updateStock = async () => {
  message.value = ""
  if (!productId.value || stock.value == null) {
    message.value = "Completa todos los campos"
    return
  }
  try {
    await store.updateStock({ productId: productId.value, stock: stock.value })
    message.value = "Stock actualizado"
  } catch (e) {
    message.value = "Error al actualizar"
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-bold mb-2">🔄 Actualizar stock</h2>
    <div class="flex gap-3 items-end mb-2">
      <BaseInput v-model="productId" label="ID" class="flex-1" />
      <BaseInput v-model.number="stock" type="number" label="Stock" class="w-32" />
      <BaseButton @click="updateStock" class="bg-green-600 text-white hover:bg-green-700">Guardar</BaseButton>
    </div>
    <p v-if="message" class="text-sm">{{ message }}</p>
  </div>
</template>
