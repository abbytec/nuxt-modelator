<script setup lang="ts">
import { ref } from 'vue'
import { useProductoStore } from '#nuxt-modelator/stores/useProductoStore'
import BaseInput from '../atoms/BaseInput.vue'
import BaseSelect from '../atoms/BaseSelect.vue'
import BaseButton from '../atoms/BaseButton.vue'

const store = useProductoStore()

const newProduct = ref({
  name: '  iPhone 15 Pro Max  ',
  description: 'El iPhone más avanzado con chip A17 Pro',
  category: 'Smartphones',
  price: 1299.99,
  stock: 25,
  supplierEmail: 'apple@supplier.com',
  manufacturingDate: '2023-09-15'
})

const invalidProduct = ref({
  name: '',
  description: 'x'.repeat(2001),
  category: '',
  price: -100,
  stock: -5,
  supplierEmail: 'email-inválido',
  manufacturingDate: '2025-12-31'
})

const createSampleProduct = async () => {
  console.log('🚀 Creando producto de ejemplo...')
  try {
    await store.create({ ...newProduct.value })
    setTimeout(() => store.getAll(), 500)
  } catch (error) {
    console.error('Error creando producto:', error)
  }
}

const testValidations = async () => {
  console.log('❌ Probando validaciones...')
  try {
    await store.create({ ...invalidProduct.value })
  } catch (error) {
    console.log('✅ Validaciones funcionando:', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-green-50 p-6 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-green-800">✅ Crear Producto Válido</h3>
        <div class="space-y-4">
          <BaseInput v-model="newProduct.name" placeholder="Nombre del producto" class="w-full" />
          <BaseSelect v-model="newProduct.category" class="w-full">
            <option>Smartphones</option>
            <option>Laptops</option>
            <option>Audio</option>
            <option>Tablets</option>
          </BaseSelect>
          <BaseInput v-model="newProduct.price" type="number" placeholder="Precio" class="w-full" />
          <textarea v-model="newProduct.description" placeholder="Descripción" rows="3" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"></textarea>
        </div>
        <BaseButton @click="createSampleProduct" :disabled="store.loading.create" class="w-full mt-4 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
          {{ store.loading.create ? '⏳ Creando...' : '✅ Crear Producto' }}
        </BaseButton>
      </div>

      <div class="bg-red-50 p-6 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-red-800">❌ Probar Validaciones</h3>
        <div class="space-y-3 mb-4 text-sm text-red-600">
          <div>❌ Nombre vacío (Required)</div>
          <div>❌ Descripción >2000 chars (MaxLength)</div>
          <div>❌ Precio negativo (IsPositive)</div>
          <div>❌ Email inválido (Email)</div>
          <div>❌ Fecha futura (PastDate)</div>
        </div>
        <BaseButton @click="testValidations" :disabled="store.loading.create" class="w-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
          ❌ Probar Validaciones
        </BaseButton>
      </div>
    </div>

    <div v-if="store.validationErrors.create?.length" class="bg-red-100 border border-red-300 rounded-lg p-6">
      <h3 class="font-semibold text-red-800 mb-3">🚨 Errores de Validación:</h3>
      <ul class="list-disc list-inside text-red-700 space-y-1">
        <li v-for="error in store.validationErrors.create" :key="error.field">
          <strong>{{ error.field }}:</strong> {{ error.message }}
        </li>
      </ul>
    </div>
  </div>
</template>
