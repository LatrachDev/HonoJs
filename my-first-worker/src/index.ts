import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { sign } from 'hono/jwt'
import { getCookie, setCookie } from 'hono/cookie'
import { hash, compare } from 'bcryptjs'



interface env { 
	DATABASE_URL: string
	SECRET: string
}

const app = new Hono<{Bindings:env}>()

const schema = z.object({
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

app.use(logger())

app.post('/signup', zValidator('json', signupSchema), async (c) => {
	
	try {
		const { name, email, password } = await c.req.json();

		const prisma = new PrismaClient({
			datasourceUrl: c.env.DATABASE_URL,
		}).$extends(withAccelerate());

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
	} catch (error) {
		console.error('Signup error:', error);
    	return c.json({ error: 'Internal server error', details: String(error) }, 500);
	}
})

app.post('/login', zValidator('json', schema), async (c) => {
	const  { email, password } = await c.req.json();

	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());

	const user = await prisma.user.findUnique({ where: { email } });
	
	if (!user || !(await compare(password, user.password))) {
		throw new HTTPException(401, { message: 'Invalid credentials' });
	}

	const payload = {
		id: user.id,
		email: user.email, 
		exp: Math.floor(Date.now() / 1000) + 60 *60
	}
	const token = await sign(payload, c.env.SECRET || '');
	setCookie(c, 'token', token);

	return c.json({ message: 'Login successful', token });
})

app.get('/debug-env', (c) => {
  return c.json({
    DATABASE_URL: c.env.DATABASE_URL,
    SECRET: c.env.SECRET ? '✅ exists' : '❌ missing',
  });
});

app.get('/ping', (c) => c.text('pong'))


app.get('/', async (c) => {
//   const prisma = new PrismaClient({
//     datasourceUrl: c.env.DATABASE_URL,
//   }).$extends(withAccelerate())

  return c.text(`Connected to DB: ${c.env.DATABASE_URL}`)
})

// creating new user
app.post('/create-user', async (c) => {
	const body = await c.req.json()

	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate())

	try {
		const user = await prisma.user.create({
			data: {
				name: body.name,
				email: body.email,
			},
		})

		return c.json({
			message: 'User created successfully',
			user,
		})
	} catch (err) {
		console.error(err)
		return c.json({ error: 'Failed to create user', details:err }, 500)
	}

})

// get all users
app.get('/users', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate())


	const users = await prisma.user.findMany()

	return c.json(users)
})

// get a specefic user
app.get('/users/:id', async (c) => {

	const id = Number(c.req.param('id'))

	const prisma = new PrismaClient ({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate())

	const user = await prisma.user.findUnique({ where: { id } })
	if(!user) {
		return c.json({ error: 'User not found' }, 404)
	}

	return c.json(user)
})

// update a user
app.put('/users/:id', async (c) => {
	const id = Number(c.req.param('id'))
	const body = await c.req.json()

	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate())

	try {
		const user = await prisma.user.update({
			where: { id },
			data: {
				name: body.name,
				email: body.email,
			}
		})

		return c.json({ message: 'User update', user })
	} catch (error) {
		return c.json({ error: 'Update Failed', details: error }, 500)
	}
})

// delete user
app.delete('/users/:id', async (c) => {
	const id = Number(c.req.param('id'))

	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate())

	try {
		const user = await prisma.user.delete({ where: { id } })

		return c.json({ message: 'User deleted' })
	} catch (error) {
		return c.json({ message: 'Delete failed', details: error }, 500)
	}
})

export default app