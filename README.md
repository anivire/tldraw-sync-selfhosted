# tldraw-sync-selfhosted

A self-hosted, open-source backend for [tldraw](https://tldraw.dev) real-time collaborative drawing. This project provides a fully self-hosted alternative to the Cloudflare-based tldraw sync server, using Node.js, WebSockets, and S3-compatible storage.

## Features

- **Real-time Collaboration**: WebSocket-based synchronization for multiple users drawing simultaneously
- **Asset Management**: Upload and serve images/videos with S3-compatible storage (e.g., Garage, MinIO)
- **Self-Hosted**: No dependency on proprietary cloud services
- **Scalable**: Supports multiple rooms with in-memory state management
- **Open Source**: MIT licensed, community-driven

## Architecture

This server replaces Cloudflare Workers and Durable Objects with:
- **Express.js** for HTTP API
- **WebSocket** for real-time sync
- **AWS SDK** for S3-compatible storage
- **tldraw/sync-core** for room state management

## Installation

### Prerequisites

- Node.js 18+
- An S3-compatible storage service (e.g., [Garage](https://garagehq.deuxfleurs.fr/), MinIO, or AWS S3)

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
- Access the drawing app and create/join rooms

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

- `POST /api/uploads/:uploadId` - Upload assets
- `GET /api/uploads/:uploadId` - Download assets
- `GET /api/unfurl` - URL metadata (placeholder)
- `WebSocket /api/connect/:roomId` - Real-time sync

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `S3_ENDPOINT` | S3-compatible endpoint URL | Required |
| `S3_ACCESS_KEY_ID` | Access key | Required |
| `S3_SECRET_ACCESS_KEY` | Secret key | Required |
| `S3_BUCKET_NAME` | Bucket name | Required |
| `S3_REGION` | Region | `garage` |
| `PORT` | Server port | `3000` |

### Storage

Rooms are persisted as JSON snapshots in your S3 bucket under the `rooms/` prefix. Assets are stored under `uploads/`.

## Deployment

### Docker (Example)

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

This is a community-maintained, self-hosted version of tldraw sync. Not affiliated with tldraw GmbH. Use at your own risk.
