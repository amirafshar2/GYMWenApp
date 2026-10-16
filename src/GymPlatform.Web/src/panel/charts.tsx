import { useState } from 'react'
import { faNum, jalali, toman } from '@/lib/fa'

/** رنگ ثابت هر منبع درآمد در همهٔ نمودارها (با برچسب متنی کنارش، نه فقط رنگ) */
export const SERIES = [
  { key: 'membership', label: 'عضویت', color: '#0b5fb0' },
  { key: 'shop', label: 'فروشگاه', color: '#ffb400' },
  { key: 'canteen', label: 'بوفه', color: '#2fb380' },
] as const
type Key = (typeof SERIES)[number]['key']

const f1 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })
/** مبلغ کوتاه: ۱۲٫۵ میلیون / ۸۵۰ هزار */
export const short = (n: number) => n >= 1_000_000_000 ? `${f1.format(n / 1e9)} میلیارد` : n >= 1_000_000 ? `${f1.format(n / 1e6)} میلیون` : n >= 1000 ? `${faNum(Math.round(n / 1000))} هزار` : faNum(n)

function niceMax(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-4 text-[13px] text-rubber">
      {SERIES.map((s) => <li key={s.key} className="flex items-center gap-1.5"><span className="size-3 rounded-[2px]" style={{ background: s.color }} />{s.label}</li>)}
    </ul>
  )
}

/** ستون‌های روی‌هم درآمد روزانه؛ با نگه‌داشتن ماوس/لمس، جزئیات همان روز نمایش داده می‌شود */
export function DailyRevenueChart({ data }: { data: { date: string; membership: number; shop: number; canteen: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 760, H = 260, L = 64, R = 8, T = 12, B = 30
  const totals = data.map((d) => d.membership + d.shop + d.canteen)
  const max = niceMax(Math.max(...totals, 0))
  const bw = (W - L - R) / Math.max(1, data.length)
  const y = (v: number) => T + (H - T - B) * (1 - v / max)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const every = Math.ceil(data.length / 8)
  const h = hover !== null ? data[hover] : null
  const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0

  return (
    <div className="-mx-1 overflow-x-auto px-1"><div className="relative min-w-[620px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ direction: 'ltr' }} role="img"
        aria-label={`درآمد روزانهٔ ${faNum(data.length)} روز اخیر؛ میانگین روزانه ${short(avg)} تومان`}
        onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e5e5" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b6b6b">{short(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          let acc = 0
          const x = L + i * bw + bw * 0.14
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} opacity={hover === null || hover === i ? 1 : 0.45}>
              <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
              {SERIES.map((s) => {
                const v = d[s.key as Key]
                const top = y(acc + v), bottom = y(acc)
                acc += v
                return v > 0 ? <rect key={s.key} x={x} y={top} width={bw * 0.72} height={Math.max(0, bottom - top)} fill={s.color} rx={1.5} /> : null
              })}
              {i % every === 0 && <text x={L + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b6b6b">{jalali(d.date + 'T12:00:00Z', { day: 'numeric', month: 'short' })}</text>}
            </g>
          )
        })}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-2 rounded-[6px] bg-chalk px-3 py-2 text-[12.5px] text-white shadow-lg"
          style={{ [hover! < data.length / 2 ? 'left' : 'right']: '8%' }}>
          <p className="mb-1 font-bold">{jalali(h.date + 'T12:00:00Z', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          {SERIES.map((s) => <p key={s.key} className="flex justify-between gap-6"><span>{s.label}</span><span>{short(h[s.key as Key])}</span></p>)}
          <p className="mt-1 flex justify-between gap-6 border-t border-white/20 pt-1 font-bold"><span>جمع</span><span>{toman(h.membership + h.shop + h.canteen)}</span></p>
        </div>
      )}
    </div></div>
  )
}

/** مقایسهٔ شعبه‌ها: نوار افقی روی‌هم */
export function BranchBars({ rows }: { rows: { name: string; membership: number; shop: number; canteen: number }[] }) {
  const max = Math.max(...rows.map((r) => r.membership + r.shop + r.canteen), 1)
  return (
    <ul className="grid gap-3">
      {rows.map((r) => {
        const total = r.membership + r.shop + r.canteen
        return (
          <li key={r.name}>
            <div className="mb-1 flex justify-between gap-3 text-[13px]"><span className="truncate font-bold text-chalk">{r.name}</span><span className="shrink-0 text-rubber">{short(total)}</span></div>
            <div className="flex h-3 overflow-hidden rounded-full bg-steel" style={{ width: `${Math.max(2, (100 * total) / max)}%` }}
              title={SERIES.map((s) => `${s.label}: ${toman(r[s.key as Key])}`).join(' — ')}>
              {SERIES.map((s) => <span key={s.key} style={{ width: `${total ? (100 * r[s.key as Key]) / total : 0}%`, background: s.color }} />)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** ورود بر حسب ساعت روز (فقط ساعت‌های کاری) */
export function HourBars({ counts }: { counts: number[] }) {
  const hours = counts.map((c, h) => ({ h, c })).filter((x) => x.h >= 6 && x.h <= 23)
  const max = Math.max(...hours.map((x) => x.c), 1)
  const peak = hours.reduce((a, b) => (b.c > a.c ? b : a), hours[0])
  return (
    <div>
      <div className="flex h-32 items-end gap-1" dir="ltr" role="img" aria-label={`شلوغ‌ترین ساعت: ${faNum(peak.h)} تا ${faNum(peak.h + 1)}`}>
        {hours.map((x) => (
          <div key={x.h} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`ساعت ${faNum(x.h)}: ${faNum(x.c)} ورود`}>
            <span className={x.h === peak.h ? 'w-full rounded-t-[3px] bg-plate' : 'w-full rounded-t-[3px] bg-plate/35'} style={{ height: `${(100 * x.c) / max}%`, minHeight: x.c ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-center text-[10.5px] text-rubber" dir="ltr">
        {hours.map((x) => <span key={x.h} className="flex-1">{x.h % 3 === 0 ? faNum(x.h) : ''}</span>)}
      </div>
    </div>
  )
}

/** نمودار خطی وزن (پنل مربی و پروفایل) */
export function WeightLine({ points, height = 170 }: { points: { label: string; kg: number }[]; height?: number }) {
  if (points.length < 2) return <p className="rounded-[3px] bg-steel px-4 py-8 text-center text-[14px] text-rubber">حداقل دو وزن لازم است تا نمودار ساخته شود.</p>
  const W = 600, H = height, P = 30
  const ys = points.map((p) => p.kg), min = Math.min(...ys) - 1, max = Math.max(...ys) + 1
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1)
  const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')
  const showEvery = Math.ceil(points.length / 7)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ direction: 'ltr' }} role="img" aria-label={`روند وزن از ${faNum(points[0].kg)} تا ${faNum(points[points.length - 1].kg)} کیلوگرم`}>
      <path d={`${line} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="#0b5fb0" opacity=".1" />
      <path d={line} fill="none" stroke="#0b5fb0" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.kg)} r="4.5" fill="#fff" stroke="#2c2c2c" strokeWidth="2"><title>{`${p.label}: ${faNum(p.kg)} کیلو`}</title></circle>
          {(i % showEvery === 0 || i === points.length - 1) && <>
            <text x={x(i)} y={y(p.kg) - 11} textAnchor="middle" fontSize="12" fontWeight="700" fill="#2c2c2c">{faNum(p.kg)}</text>
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b6b6b">{p.label}</text>
          </>}
        </g>
      ))}
    </svg>
  )
}
