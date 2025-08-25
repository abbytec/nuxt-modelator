<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HeaderSection from '~/components/organisms/HeaderSection.vue'
import StatsSection from '~/components/organisms/StatsSection.vue'
import ProductsTab from '~/components/organisms/ProductsTab.vue'
import CreateTab from '~/components/organisms/CreateTab.vue'
import SearchTab from '~/components/organisms/SearchTab.vue'
import FeaturesSection from '~/components/organisms/FeaturesSection.vue'
import AdminTab from '~/components/organisms/AdminTab.vue'
import { useProductoStore } from '#nuxt-modelator/stores/useProductoStore'

const currentTab = ref('products')
const store = useProductoStore()

const buttonClass = (tab: string) => [
  currentTab.value === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500',
  'py-4 px-1 border-b-2 font-medium text-sm'
]

onMounted(async () => {
  console.log('🍃 Nuxt-Modelator MongoDB Demo iniciado')
  await store.getAll()
  console.log('✅ Demo listo!')
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
    <div class="container mx-auto px-4 py-8 max-w-7xl">
      <HeaderSection />
      <StatsSection />
      <div class="bg-white rounded-xl shadow-lg mb-8">
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6">
            <button @click="currentTab = 'products'" :class="buttonClass('products')">📦 Productos</button>
            <button @click="currentTab = 'create'" :class="buttonClass('create')">➕ Crear</button>
            <button @click="currentTab = 'search'" :class="buttonClass('search')">🔍 Búsqueda</button>
            <button @click="currentTab = 'admin'" :class="buttonClass('admin')">🛠️ Admin</button>
          </nav>
        </div>
        <div class="p-6">
          <ProductsTab v-if="currentTab === 'products'" />
          <CreateTab v-else-if="currentTab === 'create'" />
          <SearchTab v-else-if="currentTab === 'search'" />
          <AdminTab v-else />
        </div>
      </div>
      <FeaturesSection />
    </div>
  </div>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
