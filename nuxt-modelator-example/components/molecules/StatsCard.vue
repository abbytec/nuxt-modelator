<script setup lang="ts">
interface Props {
  icon: string
  label: string
  value: string | number
  borderColor: string
  iconBg: string
  textColor: string
}
const props = defineProps<Props>()
</script>

<template>
  <div class="bg-white rounded-xl shadow-lg p-6 border-l-4" :class="props.borderColor">
    <div class="flex items-center">
      <div class="p-3 rounded-full" :class="props.iconBg">
        <span class="text-2xl">{{ props.icon }}</span>
      </div>
      <div class="ml-4">
        <p class="text-sm text-gray-600">{{ props.label }}</p>
        <p class="text-2xl font-bold" :class="props.textColor">{{ props.value }}</p>
      </div>
    </div>
  </div>
</template>
