import { useEffect, useState } from 'react'
import { ArrowLeftRight, ChartNoAxesCombined, LayoutDashboard, LogOut, Menu, Settings, Users, Wallet } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/balances', label: 'Balances', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
]

function Shell({ children }) {
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const navigate = useNavigate()
  const location = useLocation()
  const title = navItems.find((item) => item.to === location.pathname)?.label || (location.pathname.includes('settings') ? 'Settings' : 'New transaction')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function handleLogout() {
    setSigningOut(true)
    try { await signOut(); navigate('/login') } finally { setSigningOut(false) }
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Wallet size={21} /></span><span>Counter<span className="brand-light">Ledger</span></span></div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/settings" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Settings size={19} /><span>Settings</span></NavLink>
          <button className="nav-link signout-link" disabled={signingOut} onClick={handleLogout}><LogOut size={19} strokeWidth={1.8} /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button>
          <div className="profile-row"><span className="avatar">{user?.username?.slice(0, 1).toUpperCase() || 'A'}</span><div className="profile-name"><strong>{user?.username}</strong><small>Administrator</small></div></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button><div className="topbar-title">{title}</div><div className="topbar-right"><span className="topbar-date">{new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(now)}</span><span className="local-clock" aria-label="Local time in Manila">{new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(now)}</span></div></header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  )
}

export default Shell
