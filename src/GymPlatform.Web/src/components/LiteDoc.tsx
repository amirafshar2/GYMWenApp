import type { ReactNode } from 'react'
import { fill } from '@/lib/site'

/**
 * Einfacher Text, den der Inhaber im Panel schreibt → sicheres HTML (ohne dangerouslySetInnerHTML):
 * „## “ Überschrift, „- “ Listenpunkt, [[…]] auszufüllende Lücke (gelb), und {name} {city} {phone} … werden ersetzt.
 */
export default function LiteDoc({ text, showBlanks = true }: { text: string; showBlanks?: boolean }) {
  const out: ReactNode[] = []
  let list: ReactNode[] = []
  const flush = () => { if (list.length) { out.push(<ul key={`u${out.length}`}>{list}</ul>); list = [] } }
  fill(text).split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line) { flush(); return }
    if (line.startsWith('## ')) { flush(); out.push(<h2 key={i}>{inline(line.slice(3), showBlanks)}</h2>); return }
    if (line.startsWith('- ')) { list.push(<li key={i}>{inline(line.slice(2), showBlanks)}</li>); return }
    flush(); out.push(<p key={i}>{inline(line, showBlanks)}</p>)
  })
  flush()
  return <>{out}</>
}

function inline(s: string, showBlanks: boolean): ReactNode[] {
  return s.split(/(\[\[[^\]]*\]\])/).map((part, k) => {
    const m = /^\[\[([^\]]*)\]\]$/.exec(part)
    if (!m) return part
    return showBlanks
      ? <mark key={k} className="rounded bg-sun/30 px-1 text-chalk" title="Vom Studio zu ergänzen">{m[1]}</mark>
      : <span key={k}>…</span>
  })
}
