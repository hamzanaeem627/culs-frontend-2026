// A tiny server with no dependencies: `npm start`, then open http://localhost:3000
//
// GET  /...           serves the files in this folder
// POST /api/analyze   receives colour features as JSON, answers with predictions
// GET  /api/health    says the server is alive

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { predict } from './analyse.js'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = process.env.PORT || 3000

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

async function readBody(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 10_000) throw new Error('Body too large')
  }
  return JSON.parse(body)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'POST' && url.pathname === '/api/analyze') {
    try {
      const features = await readBody(req)
      console.log('analyze', features)
      return sendJson(res, 200, { source: 'server', predictions: predict(features) })
    } catch (error) {
      return sendJson(res, 400, { error: error.message })
    }
  }

  // static files, but never from outside this folder
  try {
    const path = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
    const file = normalize(join(root, path))
    if (!file.startsWith(root)) {
      return res.writeHead(403).end('Forbidden')
    }
    const content = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
    res.end(content)
  } catch {
    res.writeHead(404).end('Not found')
  }
})

server.listen(port, () => console.log(`DermaChat on http://localhost:${port}`))
