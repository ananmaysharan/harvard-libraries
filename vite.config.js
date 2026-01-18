import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin to save coords during development
function saveCoordsPlugin() {
  return {
    name: 'save-coords',
    configureServer(server) {
      server.middlewares.use('/api/save-coords', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            const filePath = path.resolve(__dirname, 'public/library-coords.json');
            fs.writeFileSync(filePath, JSON.stringify(JSON.parse(body), null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), saveCoordsPlugin()],
})
