import { memo, useEffect, useState, type ReactNode } from 'react'

export type TableColumn<T> = {
  key: string
  label: string
  className?: string
  headerClassName?: string
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  emptyMessage?: string
  rowKey: (row: T) => string
  className?: string
}

const DataTable = <T,>({
  columns,
  data,
  emptyMessage = 'Aucune donnée disponible.',
  rowKey,
  className = '',
}: DataTableProps<T>) => {
  const [showAll, setShowAll] = useState(false)
  // Replié quand le nombre de lignes change (recherche...). On suit la
  // longueur et non la référence : les parents recréent souvent le tableau
  // à chaque rendu, ce qui replierait le tableau en pleine interaction.
  const dataLength = data.length
  useEffect(() => { setShowAll(false) }, [dataLength])
  const displayedData = showAll ? data : data.slice(0, 10)

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 ${column.headerClassName ?? ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-600">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            displayedData.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={`${rowKey(row)}-${column.key}`} className={`px-6 py-4 text-sm ${column.className ?? ''}`}>
                    {column.render ? column.render(row) : (row as Record<string, unknown>)[column.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {data.length > 10 && (
        <div className="flex justify-center border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-full border border-green-700 px-5 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
          >
            {showAll ? 'Voir moins' : 'Voir plus'}
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(DataTable) as typeof DataTable
