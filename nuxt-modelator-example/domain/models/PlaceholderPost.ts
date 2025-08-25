import 'reflect-metadata'
import { Model } from 'nuxt-modelator/dist/decorators'
import { logRequest, getAllRequest } from 'nuxt-modelator/dist/middlewares'

@Model(
  {
    basePath: '/api',
    plural: 'placeholderPosts',
    enableList: true,
  },
  {
    getAll: [
      logRequest(),
      getAllRequest({
        url: 'https://jsonplaceholder.typicode.com/posts',
      }),
    ],
  }
)
export class PlaceholderPost {
  id!: number
  title!: string
  body!: string
}
