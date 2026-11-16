export function asyncRoute(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next) }
export function notFound(req, res) { res.status(404).json({ timestamp: new Date().toISOString(), status: 404, message: 'Resource not found.' }) }
export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return
  const status = error.status ?? (error.code === '23505' ? 409 : error.code === '23503' ? 409 : error.code === '23514' ? 400 : 500)
  const message = status === 500 ? 'An unexpected server error occurred.' : error.message
  if (status >= 500) console.error(JSON.stringify({ level: 'error', message: 'Request failed', code: error.code, path: req.path }))
  res.status(status).json({ timestamp: new Date().toISOString(), status, message })
}
