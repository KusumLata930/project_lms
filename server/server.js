import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { clerkMiddleware } from '@clerk/express'
import connectDB from './configs/mongodb.js'
import { uploadDir } from './configs/multer.js'
import { clerkWebHooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoutes.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js'

// initialise Express
const app = express()

// connect to database
await connectDB()

// middlewares
app.use(cors())

// routes
app.get('/', (req, res) => res.send("API Working"))

// Clerk webhook needs the raw body, so it is registered before express.json()
app.post('/clerk', express.raw({ type: 'application/json' }), clerkWebHooks)

app.use(express.json())
app.use(clerkMiddleware())

// uploaded course thumbnails
app.use('/uploads', express.static(uploadDir))

app.use('/api/educator', educatorRouter)
app.use('/api/course', courseRouter)
app.use('/api/user', userRouter)

// error handler (e.g. multer upload errors)
app.use((err, req, res, next) => {
    res.status(400).json({ success: false, message: err.message })
})

// port
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
