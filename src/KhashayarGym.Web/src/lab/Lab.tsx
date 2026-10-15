// صفحهٔ آزمایشی برای دیدن دموی کامپوننت‌های 21st.dev — فقط در توسعه (/lab?c=slug)
import { lazy, Suspense } from 'react'

const demos = import.meta.glob('./demos/*.tsx')

export default function Lab() {
  const slug = new URLSearchParams(location.search).get('c')
  const entries = Object.keys(demos).map((k) => k.replace('./demos/', '').replace('.tsx', ''))
  if (!slug) return <ul className="p-24">{entries.map((e) => <li key={e}><a href={`/lab?c=${e}`}>{e}</a></li>)}</ul>
  const loader = demos[`./demos/${slug}.tsx`] as () => Promise<Record<string, React.ComponentType>>
  const C = lazy(async () => {
    const m = await loader()
    let comp: unknown = m.default ?? Object.values(m).find((v) => typeof v === 'function')
    if (comp && typeof comp === 'object') comp = Object.values(comp).find((v) => typeof v === 'function')
    return { default: comp as React.ComponentType }
  })
  return <div dir="ltr"><Suspense fallback={null}><C /></Suspense></div>
}
