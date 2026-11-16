import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, login, logout } from '../services/api'

const AuthContext = createContext(null)
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    const clear = () => setUser(null)
    window.addEventListener('ledger:unauthorized', clear)
    api.get('/auth/csrf')
      .then(() => api.get('/auth/me'))
      .then(({ data }) => { if (active) setUser({ username: data.username }) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false; window.removeEventListener('ledger:unauthorized', clear) }
  }, [])

  const value = useMemo(() => ({
    user,
    checking,
    async signIn(username, password) {
      const result = await login(username, password)
      setUser({ username: result.username })
    },
    async signOut() {
      try { await logout() } finally { setUser(null) }
    },
    setUser,
  }), [user, checking])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }
