import { ZodError } from 'zod'
import { isProduction } from '../config/env.js'
import { AppError } from '../utils/httpError.js'

export function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Invalid request payload',
      errors: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500
  const message = err instanceof AppError ? err.message : 'Internal server error'

  const payload = { message }
  if (err instanceof AppError && err.details) {
    payload.details = err.details
  }
  if (!isProduction && !(err instanceof AppError)) {
    payload.debug = err.message
  }

  if (statusCode >= 500) {
    console.error(err)
  }

  return res.status(statusCode).json(payload)
}
