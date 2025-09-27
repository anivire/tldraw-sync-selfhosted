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
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

// Environment variables
const S3_ENDPOINT = process.env.S3_ENDPOINT!
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID!
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY!
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!
const S3_REGION = process.env.S3_REGION || 'garage'
const PORT = process.env.PORT || 3000

const schema = createTLSchema({
	shapes: { ...defaultShapeSchemas },
})

const s3 = new S3Client({
	region: S3_REGION,
	endpoint: S3_ENDPOINT,
	credentials: {
		accessKeyId: S3_ACCESS_KEY_ID,
		secretAccessKey: S3_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
})

// Rooms map with LRU-style cleanup
const rooms = new Map<string, TLSocketRoom<any, void>>()
const roomAccessTimes = new Map<string, number>()

// Clean up inactive rooms after 1 hour
setInterval(() => {
	const now = Date.now()
	const cutoff = now - (60 * 60 * 1000) // 1 hour
	for (const [roomId, lastAccess] of roomAccessTimes) {
		if (lastAccess < cutoff && rooms.has(roomId)) {
			rooms.delete(roomId)
			roomAccessTimes.delete(roomId)
			console.log(`Cleaned up inactive room: ${roomId}`)
		}
	}
}, 10 * 60 * 1000) // Check every 10 minutes

// Get or create room
async function getRoom(roomId: string): Promise<TLSocketRoom<any, void>> {
	roomAccessTimes.set(roomId, Date.now())
	
	if (rooms.has(roomId)) {
		return rooms.get(roomId)!
	}

	// Load from S3
	let initialSnapshot: any
	try {
		const command = new GetObjectCommand({
			Bucket: S3_BUCKET_NAME,
			Key: `rooms/${roomId}`,
		})
		const response = await s3.send(command)
		if (response.Body) {
			const body = await response.Body.transformToString()
			initialSnapshot = JSON.parse(body)
		}
	} catch (e) {
		// Room not found in S3, will create new room
		console.log(`Room ${roomId} not found in S3, creating new room`)
	}

	const room = new TLSocketRoom<any, void>({
		schema,
		initialSnapshot,
		onDataChange: () => {
			schedulePersistToS3(roomId, room)
		},
	})

	rooms.set(roomId, room)
	return room
}

// Throttled persistence
const persistThrottles = new Map<string, () => void>()
function schedulePersistToS3(roomId: string, room: TLSocketRoom<any, void>) {
	if (!persistThrottles.has(roomId)) {
		persistThrottles.set(roomId, throttle(async () => {
			const snapshot = JSON.stringify(room.getCurrentSnapshot())
			const command = new PutObjectCommand({
				Bucket: S3_BUCKET_NAME,
				Key: `rooms/${roomId}`,
				Body: snapshot,
				ContentType: 'application/json',
			})
			await s3.send(command)
		}, 10_000))
	}
	persistThrottles.get(roomId)!()
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

// Check room existence
app.get('/api/room/:roomId/exists', async (req, res) => {
	const roomId = req.params.roomId
	try {
		await s3.send(new HeadObjectCommand({
			Bucket: S3_BUCKET_NAME,
			Key: `rooms/${roomId}`,
		}))
		res.json({ exists: true })
	} catch (e) {
		res.json({ exists: false })
	}
})

// Unfurl (placeholder)
app.get('/api/unfurl', (_req, res) => {
	// Implement unfurl logic here, e.g., using a library
	res.json({ title: 'Placeholder', description: 'Placeholder' })
})

// Start server
const server = app.listen(Number(PORT), '0.0.0.0', () => {
	console.log(`Server running on port ${PORT}`)
})

// WebSocket server
const wss = new WebSocketServer({ server })

wss.on('connection', async (ws, req) => {
	const url = new URL(req.url!, `http://${req.headers.host}`)
	const path = url.pathname
	const roomIdMatch = path.match(/^\/api\/connect\/(.+)$/)
	if (!roomIdMatch) {
		ws.close()
		return
	}
	const roomId = roomIdMatch[1]
	const sessionId = url.searchParams.get('sessionId')
	if (!sessionId) {
		ws.close()
		return
	}

	try {
		const room = await getRoom(roomId)
		room.handleSocketConnect({ sessionId, socket: ws })
	} catch (e) {
		console.error('Error connecting to room:', e)
		ws.close()
	}
})