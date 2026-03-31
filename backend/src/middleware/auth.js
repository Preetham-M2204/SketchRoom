import { AppError } from '../utils/httpError.js'
import { verifyAuthToken } from '../services/jwt.js'

export function extractBearerToken(headerValue = '') {
  const [scheme, token] = headerValue.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

export function requireAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization)
  if (!token) {
    return next(new AppError(401, 'Unauthorized'))
  }

  try {
    const payload = verifyAuthToken(token)
    req.user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
    }
    return next()
  } catch {
    return next(new AppError(401, 'Invalid or expired token'))
  }
}
