<script setup lang="ts">
import { ref } from 'vue'
import BaseInput from '../atoms/BaseInput.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useProductoStore } from '#nuxt-modelator/stores/useProductoStore'

const store = useProductoStore()

const upsert = ref({
  name: 'MacBook Pro 14',
  description: 'M3 Pro, 16GB RAM',
  category: 'Laptops',
  price: 2499.99,
  stock: 8,
  onSale: true,
  discount: 10,
})

const stockForm = ref({ id: '', amount: 1 })
const deleteId = ref('')
const supplierEmail = ref('vendor@example.com')
const slug = ref('')

const doUpsert = async () => {
  await store.saveOrUpdate({ ...upsert.value })
}

const doUpdateStock = async () => {
  if (!stockForm.value.id) return
  await store.updateStock({ productId: stockForm.value.id, data: { $inc: { stock: Number(stockForm.value.amount) || 1 } } })
}

const doDelete = async () => {
  if (!deleteId.value) return
  await store.delete(deleteId.value)
}

const findBySupplier = async () => {
  if (!supplierEmail.value) return
  await store.getBySupplier(supplierEmail.value)
}

const findBySlug = async () => {
  if (!slug.value) return
  await store.getBySlug(slug.value)
}

const loadStats = async () => {
  await store.getStats()
}
</script>

<template>
  <div class="space-y-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-white rounded-lg p-6 border">
        <h3 class="font-semibold mb-4">🔄 Guardar o Actualizar</h3>
        <div class="space-y-3">
          <BaseInput v-model="upsert.name" placeholder="Nombre" />
          <BaseInput v-model="upsert.category" placeholder="Categoría" />
          <BaseInput v-model="upsert.price" type="number" placeholder="Precio" />
          <BaseInput v-model="upsert.stock" type="number" placeholder="Stock" />
          <textarea v-model="upsert.description" rows="3" class="w-full p-3 border rounded-lg" placeholder="Descripción" />
          <div class="flex gap-2">
            <BaseButton class="bg-emerald-600 text-white hover:bg-emerald-700" :disabled="store.loading.saveOrUpdate" @click="doUpsert">
              {{ store.loading.saveOrUpdate ? '⏳...' : 'Guardar/Actualizar' }}
            </BaseButton>
            <BaseButton class="bg-gray-100 hover:bg-gray-200" @click="loadStats">📊 Stats</BaseButton>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 border">
        <h3 class="font-semibold mb-4">➕ Actualizar Stock</h3>
        <div class="space-y-3">
          <BaseInput v-model="stockForm.id" placeholder="ID del producto" />
          <BaseInput v-model="stockForm.amount" type="number" placeholder="Cantidad a incrementar" />
          <BaseButton class="bg-amber-600 text-white hover:bg-amber-700" :disabled="store.loading.updateStock" @click="doUpdateStock">
            {{ store.loading.updateStock ? '⏳...' : 'Actualizar Stock' }}
          </BaseButton>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 border">
        <h3 class="font-semibold mb-4">🗑️ Eliminar</h3>
        <div class="space-y-3">
          <BaseInput v-model="deleteId" placeholder="ID del producto" />
          <BaseButton class="bg-red-600 text-white hover:bg-red-700" :disabled="store.loading.delete" @click="doDelete">
            {{ store.loading.delete ? '⏳...' : 'Eliminar' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg p-6 border">
        <h3 class="font-semibold mb-4">📧 Productos por Proveedor</h3>
        <div class="flex gap-3">
          <BaseInput class="flex-1" v-model="supplierEmail" placeholder="email@proveedor.com" />
          <BaseButton class="bg-blue-600 text-white hover:bg-blue-700" :disabled="store.loading.getBySupplier" @click="findBySupplier">
            {{ store.loading.getBySupplier ? '⏳...' : 'Buscar' }}
          </BaseButton>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 border">
        <h3 class="font-semibold mb-4">🏷️ Buscar por Slug</h3>
        <div class="flex gap-3">
          <BaseInput class="flex-1" v-model="slug" placeholder="mi-producto-slug" />
          <BaseButton class="bg-purple-600 text-white hover:bg-purple-700" :disabled="store.loading.getBySlug" @click="findBySlug">
            {{ store.loading.getBySlug ? '⏳...' : 'Ver' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div v-if="store.entity" class="bg-gray-50 rounded-lg p-4 border">
      <h4 class="font-semibold mb-2">👁️ Seleccionado</h4>
      <pre class="text-sm overflow-auto">{{ JSON.stringify(store.entity, null, 2) }}</pre>
    </div>
  </div>
</template> 