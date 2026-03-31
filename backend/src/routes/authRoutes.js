import { Router } from 'express'
import { z } from 'zod'
import { login, signup } from '../controllers/authController.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6).max(128),
})

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

router.post('/signup', validateBody(signupSchema), signup)
router.post('/login', validateBody(loginSchema), login)

export default router
