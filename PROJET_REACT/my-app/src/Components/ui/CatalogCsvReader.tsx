import { useMemo, useState } from 'react'
import { Minus, Plus, Search } from 'lucide-react'

interface CatalogCsvReaderProps {
  text: string
  title: string
}

const FONT_SIZES = [14, 16, 18, 20, 22]

function detectDelimiter(header: string): string {
  const candidates = [';', ',', '\t', '|']
  let best = ';'
  let bestCount = 0
  for (const delimiter of candidates) {
    const count = header.split(delimiter).length - 1
    if (count > bestCount) {
      bestCount = count
      best = delimiter
    }
  }
  return best
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = []
  let current = ''
  let insideQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === delimiter && !insideQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values.map((value) => value.replace(/^"|"$/g, ''))
}

const CatalogCsvReader = ({ text, title }: CatalogCsvReaderProps) => {
  const [fontIndex, setFontIndex] = useState(1)
  const [filter, setFilter] = useState('')
  const [showAllRows, setShowAllRows] = useState(false)
  const fontSize = FONT_SIZES[fontIndex] ?? 16

  const { headers, rows } = useMemo(() => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
    if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] }
    const delimiter = detectDelimiter(lines[0])
    const headers = parseCsvLine(lines[0], delimiter)
    const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter))
    return { headers, rows }
  }, [text])

  const filteredRows = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase('fr')
    if (!term) return rows
    return rows.filter((row) => row.some((cell) => cell.toLocaleLowerCase('fr').includes(term)))
  }, [rows, filter])

  // Fluidité : un CSV intégral peut contenir des milliers de lignes.
  // On n'en rend que 250 d'un coup, le reste sur demande.
  const visibleRows = showAllRows ? filteredRows : filteredRows.slice(0, 250)

  if (headers.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aperçu vide pour « {title} ».</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-semibold text-slate-700">
          {filteredRows.length} ligne(s)
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFontIndex((i) => Math.max(0, i - 1))}
            disabled={fontIndex <= 0}
            aria-label="Réduire la taille du texte"
            className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Minus size={20} />
          </button>
          <span className="min-w-[44px] text-center text-sm font-semibold">A{fontIndex > 1 ? '+' : ''}</span>
          <button
            type="button"
            onClick={() => setFontIndex((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
            disabled={fontIndex >= FONT_SIZES.length - 1}
            aria-label="Agrandir la taille du texte"
            className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      <div className="relative border-b border-slate-200">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={filter}
          onChange={(event) => { setFilter(event.target.value); setShowAllRows(false) }}
          placeholder="Filtrer les lignes…"
          aria-label={`Filtrer les lignes de ${title}`}
          className="w-full bg-white py-3 pl-10 pr-3 text-[16px] outline-none placeholder:text-slate-500"
        />
      </div>
      <div className="max-h-[62dvh] overflow-auto sm:max-h-[68vh]">
        <table className="w-full border-collapse text-left" style={{ fontSize }}>
          <thead className="sticky top-0 z-10">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="whitespace-nowrap border-b border-slate-200 bg-slate-900 px-3 py-3 font-semibold text-white"
                >
                  {header || `Colonne ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex} className="min-w-[120px] border-b border-slate-100 px-3 py-2.5 align-top leading-relaxed text-slate-800">
                    {row[cellIndex] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length > 250 && (
          <div className="flex justify-center border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={() => setShowAllRows((current) => !current)}
              className="rounded-full border border-green-700 px-5 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
            >
              {showAllRows ? 'Voir moins' : `Voir plus (${filteredRows.length - 250} restante(s))`}
            </button>
          </div>
        )}
        {filteredRows.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-600">Aucune ligne ne correspond à ce filtre.</p>
        )}
      </div>
      <p className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
        Faites défiler horizontalement pour voir toutes les colonnes. Pincez ou utilisez A± pour le confort de lecture.
      </p>
    </div>
  )
}

export default CatalogCsvReader
