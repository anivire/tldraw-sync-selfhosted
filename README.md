# tldraw-sync-selfhosted

A self-hosted, open-source backend for [tldraw](https://tldraw.dev) real-time collaborative drawing. This project provides a fully self-hosted alternative to the Cloudflare-based tldraw sync server, using Node.js, WebSockets, and MongoDB for storage.

## Features

- **Real-time Collaboration**: WebSocket-based synchronization for multiple users drawing simultaneously
- **Persistent Storage**: Whiteboard snapshots stored in MongoDB with automatic recovery
- **Asset Management**: Upload and serve images/videos with S3-compatible storage (e.g., Garage, MinIO)
- **Connection Monitoring**: Real-time connection status with automatic reconnection
- **Long-term Retention**: Whiteboards remain active for 24 hours of inactivity
- **Self-Hosted**: No dependency on proprietary cloud services
- **Scalable**: Supports multiple whiteboards with in-memory state management
- **Open Source**: MIT licensed, community-driven

## Architecture

This server replaces Cloudflare Workers and Durable Objects with:
- **Express.js** for HTTP API
- **WebSocket** for real-time sync
- **MongoDB** for whiteboard state persistence
- **AWS SDK** for S3-compatible asset storage
- **tldraw/sync-core** for whiteboard state management

## Installation

### Prerequisites

- Node.js 18+
- MongoDB instance (local or cloud)
- An S3-compatible storage service (e.g., [Garage](https://garagehq.deuxfleurs.fr/), MinIO, or AWS S3) for assets

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tldraw-sync-selfhosted.git
   cd tldraw-sync-selfhosted
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=tldraw
   S3_ENDPOINT=https://your-s3-endpoint
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET_NAME=your-bucket
   S3_REGION=your-region
   PORT=3000
   ```

4. Build and run:
   ```bash
   npm run build:server
   npm run dev:server
   ```

For development (client + server):
```bash
npm run dev
```

## Usage

### Development

- Server runs on `http://localhost:3000`
- Client runs on `http://localhost:5137`
- Access the drawing app and create/join whiteboards

### Production

Deploy the server and client separately:

1. Build the client:
   ```bash
   npm run build
   ```

2. Serve the `dist/client` directory with a web server (e.g., nginx)

3. Run the server:
   ```bash
   npm run build:server
   node dist/server/server.js
   ```

### API Endpoints

- `GET /api/health` - Server health check with MongoDB status
- `POST /api/uploads/:uploadId` - Upload assets
- `GET /api/uploads/:uploadId` - Download assets
- `GET /api/unfurl` - URL metadata (placeholder)
- `GET /api/whiteboard/:whiteboardId/exists` - Check whiteboard existence
- `WebSocket /api/connect/:whiteboardId` - Real-time sync

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | MongoDB database name | `tldraw` |
| `S3_ENDPOINT` | S3-compatible endpoint URL | Required |
| `S3_ACCESS_KEY_ID` | Access key | Required |
| `S3_SECRET_ACCESS_KEY` | Secret key | Required |
| `S3_BUCKET_NAME` | Bucket name | Required |
| `S3_REGION` | Region | `us-east-1` |
| `PORT` | Server port | `3000` |

### Storage

Whiteboards are persisted as JSON snapshots in MongoDB. Assets are stored in S3-compatible storage under the `uploads/` prefix.

### Connection & Reliability

- **Connection Monitoring**: Real-time status indicators show MongoDB connection health
- **Automatic Reconnection**: Server automatically reconnects to MongoDB if connection drops
- **Graceful Degradation**: Whiteboards continue to work even when MongoDB is temporarily unavailable
- **Long-term Retention**: Active whiteboards remain in memory for 24 hours of inactivity
- **Data Persistence**: All changes are saved to MongoDB with 10-second throttling

## Deployment

### Docker Compose

The easiest way to run the application with MongoDB is using Docker Compose:

1. Copy `.env.template` to `.env` and fill in your S3 configuration:
   ```bash
   cp .env.template .env
   # Edit .env with your S3 credentials
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

3. Access the application at `http://localhost:5173`

The Docker Compose setup includes:
- **MongoDB 6.0** for whiteboard state persistence
- **tldraw application** running in development mode
- **Persistent volumes** for MongoDB data
- **Network isolation** between services

### Docker (Standalone)

For production deployment without MongoDB:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build:server
EXPOSE 3000
CMD ["node", "dist/server/server.js"]
```

### nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve client
    location / {
        root /path/to/dist/client;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to server
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve client
    location / {
        root /path/to/dist/client;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to server
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Based on the original tldraw sync implementation
- Assisted by [Grok](https://grok.x.ai/), an AI built by xAI
- Built with [tldraw](https://tldraw.dev), [Express.js](https://expressjs.com/), and other open-source tools

## Disclaimer
## tldraw License Key

If you obtained a commercial or trial license for tldraw you can provide it to the client using an environment variable so the key is never committed to git.

1. Copy the example file at the repository root:

```bash
cp .env.example .env
# Edit .env and set VITE_TLDRAW_LICENSE to your license key
```

2. The project already lists `.env` in `.gitignore`, so your local `.env` will not be committed. Vite exposes variables prefixed with `VITE_` to the client bundle. This project reads `VITE_TLDRAW_LICENSE` and passes it to the `<Tldraw />` component as `licenseKey`.

3. For production deployments, set the environment variable in your CI/CD or hosting provider (don't commit keys into source).

If the license key is missing, the app will still run but licensed features may be disabled.


This is a community-maintained, self-hosted version of tldraw sync. Not affiliated with tldraw GmbH. Use at your own risk.
