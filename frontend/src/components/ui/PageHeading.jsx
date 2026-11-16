export default function PageHeading({ title, action }) {
  return <div className="page-heading"><div><h1>{title}</h1></div>{action && <div className="heading-action">{action}</div>}</div>
}
