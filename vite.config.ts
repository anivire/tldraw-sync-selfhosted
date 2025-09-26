import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(() => {
	return {
		plugins: [react()],
		server: {
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
