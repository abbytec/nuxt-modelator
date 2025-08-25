import 'reflect-metadata'
import { Model } from 'nuxt-modelator/dist/decorators'
import { logRequest, getAllRequest, run } from 'nuxt-modelator/dist/middlewares'

const limitFive = (ctx: any) => {
  const data = ctx.args?.data
  if (Array.isArray(data)) {
    const sliced = data.slice(0, 5)
    ctx.args.data = sliced
    ctx.done(sliced)
  }
}

@Model(
  {
    basePath: '/api',
    plural: 'placeholderPosts',
    enableList: true,
  },
  {
    getAll: [
      logRequest(),
      run(limitFive, { after: true }),
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
