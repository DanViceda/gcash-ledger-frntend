function Pagination({ page, totalPages, totalElements, onChange }) {
  return <div className="pagination"><span>{totalElements} {totalElements === 1 ? 'record' : 'records'}</span><div><button className="button button-secondary button-small" disabled={page <= 0} onClick={() => onChange(page - 1)}>Previous</button><span className="page-count">Page {totalPages ? page + 1 : 0} of {totalPages}</span><button className="button button-secondary button-small" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Next</button></div></div>
}

export default Pagination
