import { createServer } from 'http'
import app from './app.js'
import { connectDB, disconnectDB } from './config/db.js'
import { env } from './config/env.js'
import { setupSocketServer } from './sockets/index.js'

async function bootstrap() {
  await connectDB()

  const httpServer = createServer(app)
  setupSocketServer(httpServer)

  let isShuttingDown = false

  const shutdown = async ({ signal, exitCode = 0, restart = false }) => {
    if (isShuttingDown) return
    isShuttingDown = true

    console.log(`Received ${signal}. Shutting down...`)

    const finish = async () => {
      await disconnectDB()
      if (restart) {
        process.kill(process.pid, 'SIGUSR2')
        return
      }
      process.exit(exitCode)
    }

    if (httpServer.listening) {
      httpServer.close(async () => {
        await finish()
      })
    } else {
      await finish()
    }

    setTimeout(() => process.exit(exitCode), 5000).unref()
  }

  httpServer.on('error', async (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${env.PORT} is already in use.`)
    } else {
      console.error('HTTP server error:', error)
    }
    await shutdown({ signal: 'SERVER_ERROR', exitCode: 1 })
  })

  httpServer.listen(env.PORT, env.HOST, () => {
    const hostLabel = env.HOST === '0.0.0.0' ? 'localhost' : env.HOST
    console.log(`Backend server running on http://${hostLabel}:${env.PORT}`)
  })

  process.on('SIGINT', () => shutdown({ signal: 'SIGINT', exitCode: 0 }))
  process.on('SIGTERM', () => shutdown({ signal: 'SIGTERM', exitCode: 0 }))
  process.once('SIGUSR2', () => shutdown({ signal: 'SIGUSR2', restart: true }))
}

bootstrap().catch(async (error) => {
  console.error('Failed to start server', error)
  await disconnectDB()
  process.exit(1)
})
