import { Context } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { HTTPException } from 'hono/http-exception'
import { sign } from 'hono/jwt'
import { getCookie, setCookie } from 'hono/cookie'
import { hash, compare } from 'bcryptjs'

const getPrisma = (c: Context) => new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
}).$extends(withAccelerate());

export const signupHandler = async (c: Context) => {
    try {
        const { name, email, password } = await c.req.json();

        const prisma = getPrisma(c)

        const existing = await prisma.user.findUnique({ where: { email } });
        
        if(existing){
            return c.json({ error: 'User already exists' }, 400)
        }

        const hashedPassword = await hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        return c.json({ messaage: 'Signup successful', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Login error:', err);
        return c.json({ error: 'Internal Server Error', details: err }, 500);
    }
}

export const loginHandler = async (c: Context) => {
    const  { email, password } = await c.req.json();

    const prisma = getPrisma(c)

    const user = await prisma.user.findUnique({ where: { email } });
	
	if (!user || !(await compare(password, user.password))) {
		throw new HTTPException(401, { message: 'Invalid credentials' });
	}
    
    const token = await sign(
    {
      id: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
        c.env.SECRET
    )

  setCookie(c, 'token', token)

  return c.json({ message: 'Login successful', token })
}