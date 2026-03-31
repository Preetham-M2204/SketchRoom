import dotenv from 'dotenv'

dotenv.config()

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || '0.0.0.0',
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sketchroom',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-change-this',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_ORIGIN:
    process.env.FRONTEND_ORIGIN ||
    'http://localhost:5173,http://127.0.0.1:5173,*',
}

export const isProduction = env.NODE_ENV === 'production'
