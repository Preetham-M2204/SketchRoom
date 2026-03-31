import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function generateAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  )
}

export function verifyAuthToken(token) {
  return jwt.verify(token, env.JWT_SECRET)
}
