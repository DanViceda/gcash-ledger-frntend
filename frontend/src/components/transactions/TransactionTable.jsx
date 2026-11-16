import { MoreHorizontal } from 'lucide-react'
import { dateTime, money } from '../../utils/format'

function TransactionTable({ items, compact = false, onSelect }) {
  return <div className="table-scroll"><table className={`data-table ${compact ? 'compact-table' : ''}`}><thead><tr><th>Service</th><th>Customer</th><th>Amount</th><th>Fee</th><th>Status</th><th>Date & time</th>{onSelect && <th />}</tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => onSelect?.(item)} className={onSelect ? 'clickable-row' : ''}><td><span className={`type-pill type-${item.type?.toLowerCase()}`}>{item.type?.replace('_', ' ')}</span></td><td>{item.customerName ? <><strong>{item.customerName}</strong><small className="table-subline">{item.customerPhoneNumber}</small></> : item.customerPhoneNumber || 'Walk-in'}</td><td className="money-cell">{money(item.amountCentavos)}</td><td className="money-cell">{money(item.feeCentavos)}</td><td><span className={`status-pill status-${item.status?.toLowerCase()}`}>{item.status}</span></td><td>{dateTime(item.createdAt)}</td>{onSelect && <td><MoreHorizontal size={18} /></td>}</tr>)}</tbody></table></div>
}

export default TransactionTable
