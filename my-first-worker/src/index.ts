import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

interface env { 
	DATABASE_URL: string
 }

const app = new Hono<{Bindings:env}>()

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