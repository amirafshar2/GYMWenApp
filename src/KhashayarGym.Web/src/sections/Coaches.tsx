import { useRef } from 'react'
import { api, type Coach } from '../lib/api'
import { useData, prefersReducedMotion } from '../lib/useData'
import { faNum } from '../lib/fa'

function CoachCard({ c }: { c: Coach }) {
  const ref = useRef<HTMLElement>(null)
  // tilt ملایم با حرکت نشانگر
  const onMove = (e: React.PointerEvent) => {
    if (prefersReducedMotion() || e.pointerType !== 'mouse') return
    const r = ref.current!.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current!.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`
  }
  const reset = () => { if (ref.current) ref.current.style.transform = '' }
  const initial = c.fullName.trim()[0]

  return (
    <article
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className="relative overflow-hidden rounded-3xl border border-steel-2 bg-steel p-6 transition-transform duration-200 ease-out"
    >
      <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-2xl bg-iron">
        {c.photoUrl ? (
          <img src={c.photoUrl} alt={c.fullName} className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center" aria-hidden>
            <span className="absolute aspect-square h-[80%] rounded-full border-[12px] border-plate/70" />
            <span className="absolute aspect-square h-[42%] rounded-full border-[5px] border-plate/40" />
            <span className="relative text-7xl font-black text-chalk">{initial}</span>
          </div>
        )}
        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${c.section === 'Women' ? 'bg-women text-iron' : 'bg-plate text-white'}`}>
          {c.section === 'Women' ? 'بانوان' : 'آقایان'}
        </span>
      </div>
      <h3 className="text-xl font-black">{c.fullName}</h3>
      <p className="mt-1 text-plate-hi">{c.specialty}</p>
      <p className="mt-3 text-sm leading-7 text-rubber">{c.bio}</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {c.achievements.map((a) => <li key={a} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-plate" />{a}</li>)}
      </ul>
      <p className="mt-5 border-t border-steel-2 pt-4 text-sm text-rubber">{faNum(c.yearsOfExperience)} سال سابقه، {c.branchName}</p>
    </article>
  )
}

export default function Coaches() {
  const { data: coaches = [] } = useData('coaches', api.coaches)
  return (
    <section id="coaches" aria-labelledby="coaches-title" className="mx-auto max-w-7xl px-4 py-24 md:px-8">
      <h2 id="coaches-title" className="section-title">مربی‌ها</h2>
      <p className="lede mt-4">مربی آقایان برای سالن آقایان، مربی بانوان برای سالن بانوان. همه با مدرک فدراسیون.</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {coaches.map((c) => <CoachCard key={c.slug} c={c} />)}
      </div>
    </section>
  )
}
