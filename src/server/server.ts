import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { TLSocketRoom } from '@tldraw/sync'
import {
	createTLSchema,
	defaultShapeSchemas,
} from '@tldraw/tlschema'
import throttle from 'lodash.throttle'
import { MongoClient, Db } from 'mongodb'
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import QRCode from 'qrcode'

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DATABASE_NAME = process.env.DATABASE_NAME || 'tldraw'
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'
const S3_ENDPOINT = process.env.S3_ENDPOINT!
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID!
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY!
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!
const S3_REGION = process.env.S3_REGION || 'us-east-1'
const PORT = process.env.PORT || 3000

const schema = createTLSchema({
	shapes: { ...defaultShapeSchemas },
})

// MongoDB connection
let mongoClient: MongoClient
let db: Db
let isMongoConnected = false

async function connectToMongoDB() {
	let retries = 0;
	const maxRetries = 10;
	const retryDelay = 2000; // 2 seconds

	while (retries < maxRetries) {
		try {
			mongoClient = new MongoClient(MONGODB_URI)
			await mongoClient.connect()
			db = mongoClient.db(DATABASE_NAME)
			isMongoConnected = true
			console.log('Connected to MongoDB')
			
			// Set up connection monitoring
			mongoClient.on('disconnected', () => {
				console.error('MongoDB disconnected!')
				isMongoConnected = false
				// Try to reconnect in background
				setTimeout(() => connectToMongoDB(), 5000)
			})
			
			mongoClient.on('reconnected', () => {
				console.log('MongoDB reconnected')
				isMongoConnected = true
			})
			
			return;
		} catch (error) {
			retries++;
			console.error(`Failed to connect to MongoDB (attempt ${retries}/${maxRetries}):`, error)
			if (retries < maxRetries) {
				console.log(`Retrying in ${retryDelay}ms...`)
				await new Promise(resolve => setTimeout(resolve, retryDelay))
			}
		}
	}
	console.error('Failed to connect to MongoDB after all retries. Exiting...')
	process.exit(1)
}

const s3 = new S3Client({
	region: S3_REGION,
	endpoint: S3_ENDPOINT,
	credentials: {
		accessKeyId: S3_ACCESS_KEY_ID,
		secretAccessKey: S3_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
})

// Whiteboards map with LRU-style cleanup
const whiteboards = new Map<string, TLSocketRoom<any, void>>()
const whiteboardAccessTimes = new Map<string, number>()

// Clean up inactive whiteboards after 24 hours (instead of 1 hour)
setInterval(() => {
	const now = Date.now()
	const cutoff = now - (24 * 60 * 60 * 1000) // 24 hours
	const cleanedUp = []
	
	for (const [whiteboardId, lastAccess] of whiteboardAccessTimes) {
		if (lastAccess < cutoff && whiteboards.has(whiteboardId)) {
			whiteboards.delete(whiteboardId)
			whiteboardAccessTimes.delete(whiteboardId)
			persistThrottles.delete(whiteboardId) // Clean up persist throttles
			cleanedUp.push(whiteboardId)
		}
	}
	
	if (cleanedUp.length > 0) {
		console.log(`Cleaned up ${cleanedUp.length} inactive whiteboards:`, cleanedUp.join(', '))
	}
}, 60 * 60 * 1000) // Check every hour instead of every 10 minutes

// Get or create whiteboard
async function getWhiteboard(whiteboardId: string): Promise<TLSocketRoom<any, void>> {
	whiteboardAccessTimes.set(whiteboardId, Date.now())
	
	if (whiteboards.has(whiteboardId)) {
		return whiteboards.get(whiteboardId)!
	}

	// Load from MongoDB
	let initialSnapshot: any
	if (isMongoConnected) {
		try {
			const collection = db.collection('whiteboards')
			const doc = await collection.findOne({ whiteboardId })
			if (doc && doc.snapshot) {
				initialSnapshot = doc.snapshot
			}
		} catch (e) {
			console.error(`Error loading whiteboard ${whiteboardId} from MongoDB:`, e)
			// Continue with empty snapshot if MongoDB fails
		}
	} else {
		console.warn(`MongoDB not connected, creating whiteboard ${whiteboardId} without loading saved data`)
	}

	const whiteboard = new TLSocketRoom<any, void>({
		schema,
		initialSnapshot,
		onDataChange: () => {
			schedulePersistToMongoDB(whiteboardId, whiteboard)
		},
	})

	whiteboards.set(whiteboardId, whiteboard)
	return whiteboard
}

// Throttled persistence
const persistThrottles = new Map<string, () => void>()
function schedulePersistToMongoDB(whiteboardId: string, whiteboard: TLSocketRoom<any, void>) {
	if (!persistThrottles.has(whiteboardId)) {
		persistThrottles.set(whiteboardId, throttle(async () => {
			if (!isMongoConnected) {
				console.warn(`Skipping persistence for whiteboard ${whiteboardId}: MongoDB not connected`)
				return
			}
			
			try {
				const snapshot = JSON.stringify(whiteboard.getCurrentSnapshot())
				const collection = db.collection('whiteboards')
				await collection.updateOne(
					{ whiteboardId },
					{ 
						$set: { 
							snapshot: JSON.parse(snapshot),
							lastModified: new Date()
						}
					},
					{ upsert: true }
				)
			} catch (error) {
				console.error(`Failed to persist whiteboard ${whiteboardId}:`, error)
			}
		}, 10_000))
	}
	persistThrottles.get(whiteboardId)!()
}

// Express app
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.raw({ type: '*/*', limit: '10mb' }))

// Asset upload
app.post('/api/uploads/:uploadId', async (req, res) => {
	const uploadId = req.params.uploadId
	const objectName = `uploads/${uploadId.replace(/[^a-zA-Z0-9_-]+/g, '_')}`

	const contentType = req.headers['content-type'] ?? ''
	if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
		return res.status(400).json({ error: 'Invalid content type' })
	}

	try {
		await s3.send(new HeadObjectCommand({
			Bucket: S3_BUCKET_NAME,
			Key: objectName,
		}))
		return res.status(409).json({ error: 'Upload already exists' })
	} catch (e) {
		// proceed
	}

	const body = req.body as Buffer
	await s3.send(new PutObjectCommand({
		Bucket: S3_BUCKET_NAME,
		Key: objectName,
		Body: body,
		ContentType: contentType,
	}))

	res.json({ ok: true })
})

// Asset download
app.get('/api/uploads/:uploadId', async (req, res) => {
	const uploadId = req.params.uploadId
	const objectName = `uploads/${uploadId.replace(/[^a-zA-Z0-9_-]+/g, '_')}`

	try {
		const command = new GetObjectCommand({
			Bucket: S3_BUCKET_NAME,
			Key: objectName,
			Range: req.headers.range,
		})
		const response = await s3.send(command)

		if (response.ContentType) res.set('content-type', response.ContentType)
		if (response.ETag) res.set('etag', response.ETag)
		if (response.ContentLength) res.set('content-length', response.ContentLength.toString())
		if (response.LastModified) res.set('last-modified', response.LastModified.toISOString())
		res.set('cache-control', 'public, max-age=31536000, immutable')
		res.set('access-control-allow-origin', '*')
		if (response.ContentRange) res.set('content-range', response.ContentRange)

		const status = response.ContentRange ? 206 : 200
		res.status(status)

		if (response.Body) {
			const buffer = await response.Body.transformToByteArray()
			res.send(Buffer.from(buffer))
		} else {
			res.status(404).end()
		}
	} catch (e) {
		console.error('S3 get error:', e)
		res.status(404).end()
	}
})

// Check whiteboard existence
app.get('/api/whiteboard/:whiteboardId/exists', async (req, res) => {
	const whiteboardId = req.params.whiteboardId
	
	if (!isMongoConnected) {
		console.warn('MongoDB not connected, cannot check whiteboard existence')
		return res.json({ exists: false })
	}
	
	try {
		const collection = db.collection('whiteboards')
		const doc = await collection.findOne({ whiteboardId })
		res.json({ exists: !!doc })
	} catch (e) {
		console.error('Error checking whiteboard existence:', e)
		res.json({ exists: false })
	}
})

// Health check endpoint
app.get('/api/health', (_req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		mongodb: isMongoConnected ? 'connected' : 'disconnected',
		whiteboards: whiteboards.size,
		uptime: process.uptime()
	})
})

// QR code endpoint
app.get('/api/qrcode/:whiteboardId', async (req, res) => {
	try {
		const { whiteboardId } = req.params
		const whiteboardUrl = `${SITE_URL}/${whiteboardId}`
		
		const qrCodeDataURL = await QRCode.toDataURL(whiteboardUrl, {
			width: 256,
			margin: 2,
			color: {
				dark: '#000000',
				light: '#FFFFFF'
			}
		})
		
		res.json({
			qrCode: qrCodeDataURL,
			url: whiteboardUrl
		})
	} catch (error) {
		console.error('Error generating QR code:', error)
		res.status(500).json({ error: 'Failed to generate QR code' })
	}
})

// Start server
const server = app.listen(Number(PORT), '0.0.0.0', async () => {
	console.log(`Server running on port ${PORT}`)
	await connectToMongoDB()
})

// WebSocket server
const wss = new WebSocketServer({ server })

wss.on('connection', async (ws, req) => {
	const url = new URL(req.url!, `http://${req.headers.host}`)
	const path = url.pathname
	const whiteboardIdMatch = path.match(/^\/api\/connect\/(.+)$/)
	if (!whiteboardIdMatch) {
		ws.close()
		return
	}
	const whiteboardId = whiteboardIdMatch[1]
	const sessionId = url.searchParams.get('sessionId')
	if (!sessionId) {
		ws.close()
		return
	}

	try {
		const whiteboard = await getWhiteboard(whiteboardId)
		whiteboard.handleSocketConnect({ sessionId, socket: ws })
	} catch (e) {
		console.error('Error connecting to whiteboard:', e)
		ws.close()
	}
})