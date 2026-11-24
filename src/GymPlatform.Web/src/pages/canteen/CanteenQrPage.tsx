import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faNum } from '@/lib/fa'
import { inputCls } from '@/member/ui'

/** Druckblatt mit QR-Codes für die Bistrotische: jeder QR öffnet die Karte der Filiale mit dem Tischnamen */
export default function CanteenQrPage() {
  const [params, setParams] = useSearchParams()
  const { data: branches = [] } = useData('branches', api.branches)
  const branch = params.get('branch') ?? ''
  const [count, setCount] = useState(8)
  const [codes, setCodes] = useState<{ label: string; svg: string; url: string }[]>([])
  const name = branches.find((b) => b.slug === branch)?.name

  useEffect(() => {
    if (!branch) return
    const labels = [...Array.from({ length: count }, (_, i) => `Tisch ${faNum(i + 1)}`), 'Herrenbereich', 'Damenbereich']
    Promise.all(labels.map(async (label) => {
      const url = `${window.location.origin}/canteen/${branch}?table=${encodeURIComponent(label)}`
      return { label, url, svg: await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#2C2C2C', light: '#FFFFFF' }, errorCorrectionLevel: 'M' }) }
    })).then(setCodes)
  }, [branch, count])

  return (
    <div className="bg-steel print:bg-white">
      <div className="mx-auto max-w-[1100px] px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <h1 className="text-[24px] font-black text-chalk">QR-Codes der Bistrotische</h1>
          <select value={branch} onChange={(e) => setParams({ branch: e.target.value })} aria-label="Filiale" className={`${inputCls} h-11 w-auto min-w-[220px] cursor-pointer`}>
            <option value="">— Filiale —</option>{branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-[14px] font-bold">Anzahl Tische
            <input type="number" min={1} max={40} value={count} onChange={(e) => setCount(Math.max(1, Math.min(40, Number(e.target.value) || 1)))} className={`${inputCls} h-11 w-20`} /></label>
          <button type="button" onClick={() => window.print()} className="ms-auto inline-flex h-11 cursor-pointer items-center gap-2 rounded-[3px] bg-plate px-5 font-bold text-white hover:bg-plate-hi"><Printer className="size-5" />Drucken</button>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
          {codes.map((c) => (
            <li key={c.label} className="break-inside-avoid rounded-[10px] border-2 border-dashed border-steel-2 bg-white p-4 text-center">
              <p className="text-[13px] font-bold text-plate">Bistro {brand.shortName} — {name}</p>
              <div className="mx-auto my-3 w-40 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
              <p className="text-[20px] font-black text-chalk">{c.label}</p>
              <p className="mt-1 text-[12px] text-rubber">Scannen, bestellen – wir melden uns, wenn es fertig ist</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
