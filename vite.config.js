import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/graphql": "http://localhost:4010",
      "/health": "http://localhost:4010",
      "/meta": "http://localhost:4010",
      "/schema-docs": "http://localhost:4010",
      "/api/microcks": "http://localhost:4010",
      "/api/expectations": "http://localhost:4010",
      "/microcks-gql": {
        target: "http://localhost:8585",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/microcks-gql/, "/graphql"),
      },
    },
  },
})
