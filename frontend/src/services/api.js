import axios from 'axios'

export const REQUEST_TIMEOUT_MS = 15000

export const api = axios.create({
  baseURL: '/',
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

let csrfToken = ''
let csrfHeader = 'X-XSRF-TOKEN'

export async function refreshCsrf() {
  const { data } = await api.get('/auth/csrf')
  csrfToken = data.token
  csrfHeader = data.headerName || 'X-XSRF-TOKEN'
  return { token: csrfToken, header: csrfHeader }
}

api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
    if (!csrfToken) await refreshCsrf()
    config.headers.set(csrfHeader, csrfToken)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('ledger:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) {
    const method = error.config?.method?.toLowerCase()
    const url = (error.config?.url || '').split('?')[0]
    const financialWrite = method === 'post'
      && /^\/?(?:transactions(?:\/|$)|balances\/(?:transfers|reconciliations)(?:\/|$))/.test(url)
    if (financialWrite) {
      return 'No response was received. This operation may have been saved. Check transaction or balance history before trying again.'
    }
    return 'Could not reach the server. Check your connection and try again.'
  }
  const message = error.response.data?.message
  if (error.response.status === 409) return message || 'This change conflicts with current ledger data.'
  if (error.response.status === 403) return 'Your request could not be verified. Refresh and try again.'
  if (error.response.status === 429) return message || 'Too many attempts. Wait a moment and try again.'
  if (error.response.status === 401) return 'Your session has ended. Sign in again to continue.'
  return message || fallback
}

export async function login(username, password) {
  await refreshCsrf()
  const { data } = await api.post('/auth/login', { username, password })
  await refreshCsrf()
  return data
}

export function logout() {
  return api.post('/auth/logout')
}

export function changePassword(currentPassword, newPassword, confirmPassword) {
  return api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword })
}

export function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const values = new Uint8Array(16)
  globalThis.crypto.getRandomValues(values)
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
}

