import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { corsOriginHandler } from './config/cors.js'
import { env } from './config/env.js'
import aiRoutes from './routes/aiRoutes.js'
import authRoutes from './routes/authRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import roomRoutes from './routes/roomRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()

app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
  })
)
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
)
app.use(express.json({ limit: '2mb' }))
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.get('/', (req, res) => {
  res.json({ message: 'SketchRoom backend is running' })
})

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/ai', aiRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
