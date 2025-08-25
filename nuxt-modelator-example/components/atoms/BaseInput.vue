<script setup lang="ts">
const model = defineModel<any>()
</script>

<template>
  <input v-model="model" class="p-3 border rounded-lg focus:ring-2 focus:outline-none" v-bind="$attrs" />
</template>
