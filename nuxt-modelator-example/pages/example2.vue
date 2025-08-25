<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePlaceholderPostStore } from '#nuxt-modelator/stores/usePlaceholderPostStore'

const store = usePlaceholderPostStore()
const posts = ref<any[]>([])

onMounted(async () => {
  posts.value = await store.getAll()
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

    <p class="text-sm text-gray-500">No server endpoint is generated for <code>/api/placeholderPosts</code>.</p>
  </div>
</template>
