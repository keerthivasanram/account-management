import React from 'react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import Pagination from './Pagination';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records matching your current filter criteria.',
  emptyAction,
  pagination,
  onRowClick,
  className = '',
  bare = false, // embedded inside another card: no own border/shadow
}) => {
  return (
    <div className={`${bare ? 'bg-white' : 'bg-white border border-[#E6EAF0] rounded-xl shadow-soft overflow-hidden'} ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-[#E6EAF0]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em] whitespace-nowrap ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.headerClassName || ''}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <LoadingState type="skeleton" rows={5} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`text-sm text-slate-900 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-brand-50/40' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-5 py-4 whitespace-nowrap align-middle ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination {...pagination} />}
    </div>
  );
};

export default DataTable;
