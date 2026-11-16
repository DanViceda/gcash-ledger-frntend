import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Protected from './components/ProtectedRoute'
import Shell from './layouts/AppLayout'
import BalancesPage from './pages/Balances'
import CustomersPage from './pages/Customers'
import DashboardPage from './pages/Dashboard'
import LoginPage from './pages/Login'
import ReportsPage from './pages/Reports'
import SettingsPage from './pages/Settings'
import TransactionFormPage from './pages/TransactionForm'
import TransactionsPage from './pages/Transactions'

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/" element={<Protected><Shell><DashboardPage/></Shell></Protected>}/>
    <Route path="/transactions" element={<Protected><Shell><TransactionsPage/></Shell></Protected>}/>
    <Route path="/transactions/new" element={<Protected><Shell><TransactionFormPage/></Shell></Protected>}/>
    <Route path="/customers" element={<Protected><Shell><CustomersPage/></Shell></Protected>}/>
    <Route path="/balances" element={<Protected><Shell><BalancesPage/></Shell></Protected>}/>
    <Route path="/reports" element={<Protected><Shell><ReportsPage/></Shell></Protected>}/>
    <Route path="/settings" element={<Protected><Shell><SettingsPage/></Shell></Protected>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}

export default function App() {
  return <ToastProvider><BrowserRouter><AuthProvider><AppRoutes/></AuthProvider></BrowserRouter></ToastProvider>
}
