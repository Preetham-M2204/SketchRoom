import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { generateAuthToken } from '../services/jwt.js'
import { serializeAuthUser } from '../services/serializers.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/httpError.js'

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validatedBody
  const normalizedEmail = email.toLowerCase().trim()

  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    throw new AppError(409, 'Email already registered')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  })

  const userPayload = serializeAuthUser(user)
  const token = generateAuthToken(userPayload)

  return res.status(201).json({
    user: userPayload,
    token,
  })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validatedBody
  const normalizedEmail = email.toLowerCase().trim()

  const user = await User.findOne({ email: normalizedEmail })
  if (!user) {
    throw new AppError(401, 'Invalid email or password')
  }

  const validPassword = await user.comparePassword(password)
  if (!validPassword) {
    throw new AppError(401, 'Invalid email or password')
  }

  const userPayload = serializeAuthUser(user)
  const token = generateAuthToken(userPayload)

  return res.json({
    user: userPayload,
    token,
  })
})
