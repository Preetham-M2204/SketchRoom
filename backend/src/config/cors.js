import { env, isProduction } from './env.js'

const configuredOrigins = env.FRONTEND_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowAnyOriginInDev = configuredOrigins.includes('*') && !isProduction

export function isOriginAllowed(origin) {
  if (!origin) return true
  if (allowAnyOriginInDev) return true
  return configuredOrigins.includes(origin)
}

export function corsOriginHandler(origin, callback) {
  if (isOriginAllowed(origin)) {
    callback(null, true)
    return
  }

  callback(new Error('Not allowed by CORS'))
}
