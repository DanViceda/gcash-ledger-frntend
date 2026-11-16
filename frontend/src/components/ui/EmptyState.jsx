import { FileText } from 'lucide-react'

function EmptyState({ icon: Icon = FileText, title, body, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><h3>{title}</h3>{body && <p>{body}</p>}{action}</div>
}

export default EmptyState
