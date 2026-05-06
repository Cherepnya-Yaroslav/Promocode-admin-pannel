import { SurfaceCard } from './SurfaceCard';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

interface Column<TItem> {
  key: string;
  header: string;
  sortKey?: string;
  render: (item: TItem) => JSX.Element | string;
}

interface ServerDataTableProps<TItem> {
  title: string;
  subtitle: string;
  columns: Column<TItem>[];
  rows: TItem[];
  getRowKey: (item: TItem) => string;
  page: number;
  pageSize: number;
  totalCount: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isLoading?: boolean;
  isError?: boolean;
  pageSizeOptions?: number[];
  onSortChange?: (sortKey: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRetry?: () => void;
}

export function ServerDataTable<TItem>({
  title,
  subtitle,
  columns,
  rows,
  getRowKey,
  page,
  pageSize,
  totalCount,
  sortBy,
  sortDir,
  isLoading = false,
  isError = false,
  pageSizeOptions = [10, 20, 50],
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRetry
}: ServerDataTableProps<TItem>): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <SurfaceCard className="table-card">
      <div className="table-card__header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="table-meta">
          {totalCount} total · page {page} · {pageSize}/page
        </span>
      </div>
      {isError ? (
        <ErrorState
          title="Unable to load server data"
          description="This foundation table is wired for backend-driven pagination, sorting, and filtering in the next stage."
          {...(onRetry ? { onRetry } : {})}
        />
      ) : isLoading ? (
        <div className="table-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No rows yet"
          description="Stage 8 stops at the table foundation so the analytics views can plug into this shell next."
        />
      ) : (
        <div className="table-scroll">
          <table className="server-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>
                    {column.sortKey && onSortChange ? (
                      <button
                        className="table-sort-button"
                        onClick={() => onSortChange(column.sortKey!)}
                        type="button"
                      >
                        <span>{column.header}</span>
                        <span className="table-sort-indicator">
                          {sortBy === column.sortKey
                            ? sortDir === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="table-footer">
        <div className="table-footer__group">
          <span className="table-meta">
            Showing page {page} of {totalPages}
          </span>
          {onPageSizeChange ? (
            <label className="table-page-size">
              <span>Rows</span>
              <select
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                value={pageSize}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="table-footer__group">
          <button
            className="button button--ghost button--table"
            disabled={!canGoPrevious || !onPageChange}
            onClick={() => onPageChange?.(page - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="button button--ghost button--table"
            disabled={!canGoNext || !onPageChange}
            onClick={() => onPageChange?.(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </footer>
    </SurfaceCard>
  );
}
