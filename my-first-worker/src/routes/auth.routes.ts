import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { loginHandler, signupHandler } from "../controllers/auth.controller";
import { loginSchema, signupSchema } from "../validators/auth.schema";

const authRouter = new Hono()

authRouter.post('/login', zValidator('json', loginSchema), loginHandler)
authRouter.post('/signup', zValidator('json', signupSchema), signupHandler)

export default authRouter