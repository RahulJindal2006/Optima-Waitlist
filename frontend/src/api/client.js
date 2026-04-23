const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  const res = await fetch(`${API}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.detail || `Request failed: ${res.status}`)
    err.status = res.status
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

// ── Waitlist ─────────────────────────────────────────────────────────────────
export const sendWaitlistCode = (data) =>
  request('/waitlist/send-code', { method: 'POST', body: JSON.stringify(data) })

export const verifyWaitlistCode = (data) =>
  request('/waitlist/verify', { method: 'POST', body: JSON.stringify(data) })
