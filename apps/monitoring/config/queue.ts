import { defineConfig } from '@nemoventures/adonis-jobs'
import Env from '#start/env'

const queueConfig = defineConfig({
  connection: {
    host: Env.get('REDIS_HOST'),
    port: Env.get('REDIS_PORT'),
    password: Env.get('REDIS_PASSWORD'),
    db: Number(Env.get('REDIS_DB', 0)),
  },
  defaultQueue: 'default',
  queues: {
    default: {},
  },
})

export default queueConfig

declare module '@nemoventures/adonis-jobs/types' {
  interface Queues extends InferQueues<typeof queueConfig> {}
}
