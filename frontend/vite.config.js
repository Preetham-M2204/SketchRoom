import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'

function resolveExistingPath(rawPath, rootDir) {
  const normalized = String(rawPath || '').trim()
  if (!normalized) return null

  const absolutePath = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(rootDir, normalized)

  if (!fs.existsSync(absolutePath)) {
    return null
  }

  return absolutePath
}

async function buildHttpsConfig(env, rootDir) {
  const certPath = resolveExistingPath(env.VITE_HTTPS_CERT_PATH, rootDir)
  const keyPath = resolveExistingPath(env.VITE_HTTPS_KEY_PATH, rootDir)
  const forceHttps = String(env.VITE_DEV_HTTPS || '').toLowerCase() === 'true'

  if (certPath && keyPath) {
    return {
      https: {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      },
      useBasicSsl: false,
      certSource: 'custom-files',
    }
  }

  if (forceHttps) {
    return {
      https: true,
      useBasicSsl: true,
      certSource: 'basic-ssl',
    }
  }

  return {
    https: undefined,
    useBasicSsl: false,
    certSource: 'disabled',
  }
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = String(env.VITE_BACKEND_TARGET || 'http://localhost:5000').trim()
  const { https, useBasicSsl, certSource } = await buildHttpsConfig(env, process.cwd())

  const plugins = [react()]
  if (useBasicSsl) {
    // Provides a generated dev cert when explicit cert paths are not configured.
    plugins.push(basicSsl())
  }

  if (certSource === 'custom-files') {
    console.log('[vite] Using certificate and key files from environment configuration.')
  }

  return {
    plugins,
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      https,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      host: true,
      port: 4173,
      https,
    },
  }
})
