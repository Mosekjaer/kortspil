import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildServer } from './app.js'

const here = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT ?? 3000)

const { app } = await buildServer({
  publicUrl: process.env.PUBLIC_URL,
  logLevel: process.env.LOG_LEVEL ?? 'info',
  webRoot: process.env.WEB_ROOT ?? resolve(here, '../../web/dist'),
})

await app.listen({ host: '0.0.0.0', port })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0))
  })
}
