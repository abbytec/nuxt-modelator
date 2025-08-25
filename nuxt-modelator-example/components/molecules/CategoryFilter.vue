<script setup lang="ts">
import BaseSelect from "../atoms/BaseSelect.vue"
import BaseButton from "../atoms/BaseButton.vue"
const model = defineModel<string>()
const props = defineProps<{ categories: string[]; loading?: boolean }>()
const emit = defineEmits<{ (e: 'filter'): void }>()
const handleFilter = () => {
  if (!model.value) return
  emit('filter')
}
</script>

<template>
  <div class="flex gap-3 mb-4">
    <BaseSelect v-model="model" class="flex-1">
      <option v-for="cat in props.categories" :key="cat" :value="cat">{{ cat }}</option>
    </BaseSelect>
    <BaseButton @click="handleFilter" :disabled="props.loading" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50">
      🏷️
    </BaseButton>
  </div>
</template>
