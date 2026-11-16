import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Protected({ children }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  if (checking) return <div className="screen-loading"><span className="spinner" /> Restoring your session…</div>
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export default Protected
