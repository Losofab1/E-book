import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  extra?: ReactNode
}

const PageHeader = ({ eyebrow, title, description, extra }: PageHeaderProps) => (
  <header className="flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-1 text-3xl font-bold">{title}</h1>
      {description && <p className="mt-2 text-slate-600">{description}</p>}
    </div>
    {extra}
  </header>
)

export default PageHeader
