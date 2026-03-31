import { io } from 'socket.io-client'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5000'
const REQUEST_TIMEOUT_MS = 10_000
const SOCKET_ACK_TIMEOUT_MS = 10_000

function fail(message) {
  throw new Error(message)
}

async function requestJson(path, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      fail(`${response.status} ${response.statusText} on ${path}: ${JSON.stringify(data)}`)
    }

    return data
  } finally {
    clearTimeout(timeout)
  }
}

function emitWithAck(socket, eventName, payload) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Socket ack timeout for ${eventName}`))
    }, SOCKET_ACK_TIMEOUT_MS)

    socket.emit(eventName, payload, (ack) => {
      clearTimeout(timeout)
      if (!ack?.ok) {
        reject(new Error(`Socket ack failed for ${eventName}: ${JSON.stringify(ack)}`))
        return
      }
      resolve(ack)
    })
  })
}

async function waitForSocketConnection(socket) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket connect timeout'))
    }, SOCKET_ACK_TIMEOUT_MS)

    socket.once('connect', () => {
      clearTimeout(timeout)
      resolve()
    })

    socket.once('connect_error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

function createStroke(strokeId, userId, base) {
  return {
    id: strokeId,
    userId,
    color: '#18170F',
    width: 3,
    timestamp: Date.now(),
    points: [
      { x: base, y: base },
      { x: base + 20, y: base + 20 },
      { x: base + 40, y: base + 10 },
    ],
  }
}

async function main() {
  const nonce = Date.now()
  const email = `canvas.phase1.${nonce}@example.com`
  const password = 'Passw0rd!'

  console.log(`Using backend: ${BASE_URL}`)
  console.log(`Creating test user: ${email}`)

  const signup = await requestJson('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Canvas Phase1 Smoke',
      email,
      password,
    }),
  })

  const token = signup?.token
  const userId = signup?.user?.id
  if (!token || !userId) {
    fail('Signup did not return token/user')
  }

  const roomResponse = await requestJson('/api/rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Canvas Smoke Room',
      mode: 'canvas',
      access: 'private',
    }),
  })

  const roomId = roomResponse?.room?.id
  if (!roomId) {
    fail('Room creation did not return room id')
  }

  console.log(`Created room: ${roomId}`)

  await requestJson(`/api/rooms/${roomId}/canvas/meta`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      boardTitle: 'Phase1 Smoke Board',
      viewport: {
        x: 12,
        y: -8,
        zoom: 1.25,
      },
    }),
  })

  console.log('Updated canvas metadata')

  const socket = io(BASE_URL, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token },
    timeout: SOCKET_ACK_TIMEOUT_MS,
  })

  try {
    await waitForSocketConnection(socket)
    console.log('Socket connected')

    await emitWithAck(socket, 'join-room', roomId)
    console.log('Joined room')

    const stroke1 = createStroke(`stroke-${nonce}-1`, userId, 10)
    const stroke2 = createStroke(`stroke-${nonce}-2`, userId, 80)

    await emitWithAck(socket, 'draw:stroke', stroke1)
    await emitWithAck(socket, 'draw:stroke', stroke2)
    console.log('Sent 2 strokes')

    const state1 = await requestJson(`/api/rooms/${roomId}/canvas/state`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    const count1 = state1?.state?.strokeCount
    if (count1 !== 2) {
      fail(`Expected strokeCount=2 after draw, got ${count1}`)
    }

    if (state1?.state?.boardTitle !== 'Phase1 Smoke Board') {
      fail('Expected boardTitle to be persisted in canvas state')
    }

    console.log('State after draw is correct')

    await emitWithAck(socket, 'draw:undo-stroke', { strokeId: stroke2.id })

    const state2 = await requestJson(`/api/rooms/${roomId}/canvas/state`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    const count2 = state2?.state?.strokeCount
    if (count2 !== 1) {
      fail(`Expected strokeCount=1 after undo, got ${count2}`)
    }
    console.log('State after undo is correct')

    await requestJson(`/api/rooms/${roomId}/canvas/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    const state3 = await requestJson(`/api/rooms/${roomId}/canvas/state`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    const count3 = state3?.state?.strokeCount
    if (count3 !== 0) {
      fail(`Expected strokeCount=0 after clear, got ${count3}`)
    }

    console.log('Canvas clear state is correct')
    console.log('Phase 1 canvas smoke test passed')
  } finally {
    socket.disconnect()
  }
}

main().catch((error) => {
  console.error('Phase 1 canvas smoke test failed')
  console.error(error?.stack || error)
  process.exitCode = 1
})
