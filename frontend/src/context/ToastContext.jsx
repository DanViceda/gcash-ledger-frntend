import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

const ToastContext = createContext(null)
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)

function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const removeTimer = useRef(null)
  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast((current) => current ? { ...current, leaving: true } : null)
    removeTimer.current = setTimeout(() => setToast(null), 220)
  }, [])
  const notify = useCallback((message, type = 'success', duration = type === 'error' ? 0 : 3000) => {
    clearTimeout(timer.current)
    clearTimeout(removeTimer.current)
    setToast({ message, type, leaving: false, id: Date.now() })
    if (duration > 0) {
      timer.current = setTimeout(() => {
        setToast((current) => current ? { ...current, leaving: true } : null)
        removeTimer.current = setTimeout(() => setToast(null), 220)
      }, duration)
    }
  }, [])
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(removeTimer.current) }, [])
  const value = useMemo(() => ({ notify }), [notify])
  return <ToastContext.Provider value={value}>{children}{toast && <div className={`toast toast-${toast.type} ${toast.leaving ? 'toast-leaving' : ''}`} role={toast.type === 'error' ? 'alert' : 'status'} aria-live={toast.type === 'error' ? 'assertive' : 'polite'} key={toast.id}><span>{toast.message}</span><button type="button" className="toast-close" aria-label="Dismiss notification" onClick={dismiss}><X size={16}/></button></div>}</ToastContext.Provider>
}

export { ToastProvider }
