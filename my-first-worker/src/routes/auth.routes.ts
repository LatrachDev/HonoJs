import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { loginHandler, signupHandler } from "../controllers/auth.controller";

const authRouter = new Hono()

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string()
		.min(8)
		.regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/)
})

const signupSchema = z.object({
    name: z.string().min(2),
	email: z.string().email(),
	password: z.string()
		.min(8)
		.regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/)
})

authRouter.post('/login', zValidator('json', loginSchema), loginHandler)
authRouter.post('/signup', zValidator('json', signupSchema), signupHandler)

export default authRouter