import React from 'react';

/**
 * Modern, accessible pagination component.
 * Supports page numbers with a sliding window and clear Prev/Next controls.
 */
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Generate page numbers to show (maximum 5 numbers around current page)
  const pages = [];
  const range = 2; // how many pages before/after current page
  const start = Math.max(1, page - range);
  const end = Math.min(totalPages, page + range);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav aria-label="Page navigation" className="d-flex justify-content-center my-4">
      <ul className="pagination pagination-sm mb-0 gap-1" role="list">
        {/* Previous Button */}
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button
            className="page-link rounded-pill px-3 py-1.5 border-0 bg-transparent text-primary hover-bg"
            onClick={() => page > 1 && onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Go to previous page"
            type="button"
          >
            <i className="bi bi-chevron-left small me-1"></i> Prev
          </button>
        </li>

        {/* First Page Link if not in window */}
        {start > 1 && (
          <>
            <li className="page-item">
              <button
                className="page-link rounded-circle d-flex align-items-center justify-content-center border-0 text-primary"
                style={{ width: '32px', height: '32px' }}
                onClick={() => onPageChange(1)}
                aria-label="Go to page 1"
                type="button"
              >
                1
              </button>
            </li>
            {start > 2 && (
              <li className="page-item disabled d-flex align-items-center px-1">
                <span className="text-muted">...</span>
              </li>
            )}
          </>
        )}

        {/* Page Numbers */}
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
            <button
              className={`page-link rounded-circle d-flex align-items-center justify-content-center border-0 ${
                p === page
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-primary hover-bg'
              }`}
              style={{ width: '32px', height: '32px' }}
              onClick={() => onPageChange(p)}
              aria-label={`Go to page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              type="button"
            >
              {p}
            </button>
          </li>
        ))}

        {/* Last Page Link if not in window */}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <li className="page-item disabled d-flex align-items-center px-1">
                <span className="text-muted">...</span>
              </li>
            )}
            <li className="page-item">
              <button
                className="page-link rounded-circle d-flex align-items-center justify-content-center border-0 text-primary"
                style={{ width: '32px', height: '32px' }}
                onClick={() => onPageChange(totalPages)}
                aria-label={`Go to page ${totalPages}`}
                type="button"
              >
                {totalPages}
              </button>
            </li>
          </>
        )}

        {/* Next Button */}
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link rounded-pill px-3 py-1.5 border-0 bg-transparent text-primary hover-bg"
            onClick={() => page < totalPages && onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Go to next page"
            type="button"
          >
            Next <i className="bi bi-chevron-right small ms-1"></i>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
