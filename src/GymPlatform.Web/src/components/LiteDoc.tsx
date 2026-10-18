import type { ReactNode } from 'react'
import { fill } from '@/lib/site'

/**
 * متن ساده‌ای که مالک در پنل می‌نویسد → HTML امن (بدون dangerouslySetInnerHTML):
 * «## » تیتر، «- » بند فهرست، [[…]] جای خالی که باید تکمیل شود (زرد)، و {name} {city} {phone} … جایگزین می‌شوند.
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
      ? <mark key={k} className="rounded bg-sun/30 px-1 text-chalk" title="باید توسط باشگاه تکمیل شود">{m[1]}</mark>
      : <span key={k}>…</span>
  })
}
