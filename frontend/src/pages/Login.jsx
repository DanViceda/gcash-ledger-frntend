import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Wallet } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function LoginPage() {
  const { signIn, user, checking } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [usernameErrorLeaving, setUsernameErrorLeaving] = useState(false)
  const [passwordErrorLeaving, setPasswordErrorLeaving] = useState(false)
  const usernameErrorTimer = useRef(null)
  const passwordErrorTimer = useRef(null)

  useEffect(() => () => {
    window.clearTimeout(usernameErrorTimer.current)
    window.clearTimeout(passwordErrorTimer.current)
  }, [])

  function dismissError(field) {
    const isUsername = field === 'username'
    const currentMessage = isUsername ? usernameError : passwordError
    if (!currentMessage) return
    const setLeaving = isUsername ? setUsernameErrorLeaving : setPasswordErrorLeaving
    const setMessage = isUsername ? setUsernameError : setPasswordError
    const timer = isUsername ? usernameErrorTimer : passwordErrorTimer
    setLeaving(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setMessage(''); setLeaving(false) }, 180)
  }
  if (checking) return <div className="screen-loading"><span className="spinner" /> Loading secure workspace…</div>
  if (user) return <Navigate to="/" replace />

  async function submit(event) {
    event.preventDefault()
    window.clearTimeout(usernameErrorTimer.current); window.clearTimeout(passwordErrorTimer.current)
    setUsernameError(''); setPasswordError(''); setUsernameErrorLeaving(false); setPasswordErrorLeaving(false)
    if (!username.trim()) { setUsernameError('Enter your username.'); return }
    if (!password) { setPasswordError('Enter your password.'); return }
    setBusy(true)
    try { await signIn(username.trim(), password); notify('Signed in.', 'success'); navigate(location.state?.from || '/', { replace: true }) }
    catch (err) { setPasswordError(err.response?.status === 401 ? 'Username or password is incorrect.' : errorMessage(err, 'Sign in failed.')); setPasswordErrorLeaving(false) }
    finally { setBusy(false) }
  }

  return (
    <div className="login-screen">
      <aside className="login-aside"><div className="login-brand brand"><span className="brand-mark"><Wallet size={21}/></span><span>Counter<span className="brand-light">Ledger</span></span></div><div className="login-message"><h1>Clear records<br/>for every transaction</h1><p>A focused workspace for your store’s completed GCash transactions, balances and daily reporting.</p></div><div className="login-aside-foot">Private administrator workspace</div></aside>
      <div className="login-main"><div className="login-card"><div className="mobile-login-brand brand"></div><h2>Welcome back</h2><p className="login-description">Sign in to manage your store’s transaction ledger.</p>
        <form onSubmit={submit} className="form-stack"><label className="field"><span>Username</span><input autoComplete="username" value={username} onChange={(e) => { setUsername(e.target.value); dismissError('username') }} aria-invalid={!!usernameError && !usernameErrorLeaving} aria-describedby={usernameError && !usernameErrorLeaving ? 'username-error' : undefined} autoFocus />{usernameError && <small className={`login-error ${usernameErrorLeaving ? 'is-exiting' : ''}`} id="username-error" role={usernameErrorLeaving ? undefined : 'alert'} aria-hidden={usernameErrorLeaving}>{usernameError}</small>}</label><label className="field"><span>Password</span><div className="password-wrap"><input type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); dismissError('password') }} aria-invalid={!!passwordError && !passwordErrorLeaving} aria-describedby={passwordError && !passwordErrorLeaving ? 'password-error' : undefined} /><button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{passwordError && <small className={`login-error ${passwordErrorLeaving ? 'is-exiting' : ''}`} id="password-error" role={passwordErrorLeaving ? undefined : 'alert'} aria-hidden={passwordErrorLeaving}>{passwordError}</small>}</label>
          <button className="button button-primary button-wide" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Signing in…</> : <>Sign in <ArrowRight size={17} /></>}</button></form>
      </div></div>
    </div>
  )
}

export default LoginPage
