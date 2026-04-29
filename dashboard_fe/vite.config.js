import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Không import tailwind ở đây nữa, PostCSS sẽ tự lo
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Hoặc '0.0.0.0' để expose cho mạng nội bộ
    port: 8174
  },
})