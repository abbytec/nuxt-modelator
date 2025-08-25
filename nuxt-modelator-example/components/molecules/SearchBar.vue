<script setup lang="ts">
import BaseInput from "../atoms/BaseInput.vue"
import BaseButton from "../atoms/BaseButton.vue"
const model = defineModel<string>()
const props = defineProps<{ loading?: boolean }>()
const emit = defineEmits<{
  (e: 'search'): void
}>()
const handleSearch = () => {
  if (!model.value.trim()) return
  emit('search')
}
</script>

<template>
  <div class="flex gap-3 mb-4">
    <BaseInput v-model="model" placeholder="Buscar productos..." class="flex-1" @keyup.enter="handleSearch" />
    <BaseButton @click="handleSearch" :disabled="props.loading" class="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
      🔍
    </BaseButton>
  </div>
</template>
