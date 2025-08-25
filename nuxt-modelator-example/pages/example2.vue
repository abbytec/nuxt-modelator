<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePlaceholderPostStore } from '#nuxt-modelator/stores/usePlaceholderPostStore'

const store = usePlaceholderPostStore()
const posts = ref<any[]>([])
const apiError = ref('')

onMounted(async () => {
  posts.value = await store.getAll()
  try {
    await $fetch('/api/placeholderPosts')
  } catch (err: any) {
    apiError.value = String(err?.statusCode || err?.message || err)
  }
})
</script>

<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-bold">External Posts</h1>
    <ul v-if="posts.length" class="list-disc ml-5">
      <li v-for="post in posts.slice(0, 5)" :key="post.id">
        {{ post.title }}
      </li>
    </ul>
    <p v-else>Cargando...</p>

    <p class="text-red-600">/api/placeholderPosts: {{ apiError }}</p>
  </div>
</template>
