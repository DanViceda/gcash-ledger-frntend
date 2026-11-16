function MetricCard({ icon: Icon, label, amount, detail, tone = '' }) {
  return <div className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={18} /></span></div><strong className="metric-value">{amount}</strong>{detail && <small>{detail}</small>}</div>
}

export default MetricCard
