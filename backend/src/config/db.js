import mongoose from 'mongoose'
import { env } from './env.js'

mongoose.set('strictQuery', true)

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return

  await mongoose.connect(env.MONGO_URI)
  console.log('MongoDB connected')
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return
  await mongoose.disconnect()
  console.log('MongoDB disconnected')
}
