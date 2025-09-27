import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(() => {
	return {
		plugins: [react()],
		server: {
			host: true, // Allow external access
			allowedHosts: [
				'draw.rccn.dev',
				'localhost',
				'127.0.0.1',
				'::1'
			],
			headers: {
				// Override CSP for development
				'Content-Security-Policy': "default-src 'self' http: https: data: blob: 'unsafe-inline'; img-src 'self' http: https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
			},
			proxy: {
				'/api': {
					target: 'http://localhost:3030',
					changeOrigin: true,
					ws: true,
				},
			},
		},
	}
})
