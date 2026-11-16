import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { changePassword, errorMessage } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PageHeading from '../components/ui/PageHeading'

const passwordFields = [
  { key: 'current', label: 'Current Password', autoComplete: 'current-password' },
  { key: 'next', label: 'New Password', autoComplete: 'new-password' },
  { key: 'confirm', label: 'Confirm New Password', autoComplete: 'new-password' },
]

function SettingsPage() {
  const { user, signOut, setUser } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('ledger-theme') === 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('ledger-theme', dark ? 'dark' : 'light')
  }, [dark])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!currentPassword) { setError('Enter your current password.'); return }
    if (Array.from(newPassword).length < 12) { setError('Use a new password with at least 12 characters.'); return }
    if (new TextEncoder().encode(newPassword).length > 72) { setError('The new password must be no more than 72 UTF-8 bytes.'); return }
    if (newPassword === currentPassword) { setError('Choose a new password that is different from your current password.'); return }
    if (newPassword !== confirmPassword) { setError('The new password entries do not match.'); return }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword, confirmPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setVisible({ current: false, next: false, confirm: false })
      notify('Password changed. Sign in again with your new password.', 'success')
      setUser(null)
      navigate('/login')
    } catch (err) { setError(errorMessage(err, 'Could not change password.')) }
    finally { setBusy(false) }
  }

  async function handleSignOut() {
    try { await signOut() } finally { navigate('/login') }
  }

  const values = { current: currentPassword, next: newPassword, confirm: confirmPassword }
  const setters = { current: setCurrentPassword, next: setNewPassword, confirm: setConfirmPassword }

  return <><PageHeading title="Settings" /><div className="settings-grid">
    <section className="panel settings-card"><span className="settings-icon"><ShieldCheck size={20}/></span><h2>{user?.username}</h2><button className="button button-secondary" onClick={handleSignOut}><LogOut size={17}/> Sign out</button></section>
    <section className="panel settings-card"><h2>Appearance</h2><p className="muted">Choose a theme for this device. Your choice applies across the ledger.</p><button className="button button-secondary theme-toggle" aria-pressed={dark} onClick={() => setDark((value) => !value)}>{dark ? <Sun size={17}/> : <Moon size={17}/>} {dark ? 'Switch to light mode' : 'Switch to dark mode'}</button></section>
    <section className="panel settings-card password-card"><h2>Change password</h2><p className="muted">Changing your password ends this session.</p>{error && <div className="alert alert-error" role="alert">{error}</div>}
      <form onSubmit={submit} className="form-stack password-form">
        {passwordFields.map(({ key, label, autoComplete }) => <label className="field" key={key}>
          <span>{label}</span>{key === 'next' && <small className="password-requirements">At least 12 characters and no more than 72 UTF-8 bytes.</small>}
          <span className="password-input-wrap"><input required type={visible[key] ? 'text' : 'password'} autoComplete={autoComplete} maxLength="72" value={values[key]} onChange={(event) => setters[key](event.target.value)} />
            <button type="button" className="password-visibility" aria-label={`${visible[key] ? 'Hide' : 'Show'} ${label}`} aria-pressed={visible[key]} onClick={() => setVisible((state) => ({ ...state, [key]: !state[key] }))}>{visible[key] ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
          </span>
        </label>)}
        <button className="button button-primary" disabled={busy}>{busy ? <><span className="spinner spinner-light"/> Updating…</> : <><Check size={16}/> Update password</>}</button>
      </form>
    </section>
  </div></>
}

export default SettingsPage
