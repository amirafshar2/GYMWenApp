import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Download, RotateCcw, XCircle } from 'lucide-react'
import { downloadBlob, memberApi, type PaymentResult } from '@/lib/api'
import { brand } from '@/lib/brand'
import { faDigits, jalali, toman } from '@/lib/fa'
import MemberCard, { useRequireAuth } from '@/member/MemberCard'
import { Btn, Notice, PageShell, Panel, Spinner } from '@/member/ui'
import { clearJoinDraft } from './JoinPage'

const DT = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const

/** Rückkehrseite vom Gateway: angezeigt wird das vom Server bestätigte Ergebnis (nicht die URL-Parameter) */
export default function JoinResultPage() {
  const { ready, user } = useRequireAuth()
  const [params] = useSearchParams()
  const id = Number(params.get('id'))
  const [p, setP] = useState<PaymentResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [dl, setDl] = useState(false)

  useEffect(() => { document.title = `Zahlungsergebnis | ${brand.name}` }, [])
  useEffect(() => {
    if (!ready || !user) return
    if (!id) { setErr('Keine Zahlung gefunden.'); return }
    memberApi.payment(id).then((r) => { setP(r); if (r.status === 'succeeded') clearJoinDraft() }).catch((e: Error) => setErr(e.message))
  }, [ready, user, id])

  if (err) return <PageShell title="Zahlungsergebnis"><Notice tone="err">{err}</Notice><Link to="/profile" className="mt-4 inline-block font-bold text-plate">Zum Profil</Link></PageShell>
  if (!p || !user) return <Spinner label="Zahlungsergebnis wird geprüft…" />

  const ok = p.status === 'succeeded'
  const row = (k: string, v: string, red = false) => (
    <div className="flex justify-between gap-4 py-2.5 text-[14px]"><dt className="text-rubber">{k}</dt><dd className={red ? 'font-bold text-plate' : 'font-bold text-chalk'}>{v}</dd></div>
  )

  return (
    <PageShell eyebrow="Online anmelden" title={ok ? 'Ihre Mitgliedschaft ist aktiv' : 'Zahlung nicht durchgeführt'}>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px] [&>*]:min-w-0">
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            {ok ? <CheckCircle2 className="size-10 text-[#1f9d55]" aria-hidden /> : <XCircle className="size-10 text-danger" aria-hidden />}
            <div>
              <p className="text-[18px] font-black text-chalk">{ok ? 'Zahlung erfolgreich' : p.status === 'pending' ? 'Zahlung noch nicht bestätigt' : 'Zahlung abgebrochen oder fehlgeschlagen'}</p>
              <p className="text-[14px] text-rubber">{ok ? 'Zahlungsbeleg und Rechnung sind bereit.' : 'Falls ein Betrag abgebucht wurde, erstattet die Bank ihn in der Regel innerhalb weniger Tage.'}</p>
            </div>
          </div>
          <dl className="divide-y divide-steel-2 border-y border-steel-2">
            {p.invoiceNumber && row('Rechnungsnummer', faDigits(p.invoiceNumber))}
            {row('Paket', `${p.packageName} — ${p.branchName}`)}
            {row('Paketpreis', toman(p.baseAmountToman))}
            {p.campaignDiscountToman > 0 && row('Aktionsrabatt', `− ${toman(p.campaignDiscountToman)}`, true)}
            {p.codeDiscountToman > 0 && row(`Rabattcode ${p.discountCode ?? ''}`, `− ${toman(p.codeDiscountToman)}`, true)}
            {row(ok ? 'Bezahlter Betrag' : 'Betrag', toman(p.amountToman))}
            {p.paidAtUtc && row('Zahlungszeitpunkt', jalali(p.paidAtUtc, DT))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            {ok ? <>
              <Btn busy={dl} onClick={async () => { setDl(true); try { await downloadBlob(() => memberApi.invoicePdf(p.id), `invoice-${p.invoiceNumber}.pdf`) } finally { setDl(false) } }}>
                <Download className="size-5" aria-hidden />Rechnung als PDF herunterladen
              </Btn>
              <Link to="/profile" className="inline-flex h-[52px] items-center rounded-[3px] bg-chalk px-6 text-[15px] font-bold text-white hover:bg-night">Profil und Mitgliedskarte</Link>
            </> : <>
              <Link to="/join" className="inline-flex h-[52px] items-center gap-2 rounded-[3px] bg-plate px-6 text-[15px] font-bold text-white hover:bg-plate-hi"><RotateCcw className="size-5" aria-hidden />Erneut versuchen</Link>
              <Link to="/#consult" className="inline-flex h-[52px] items-center rounded-[3px] border border-steel-2 bg-white px-6 text-[15px] font-bold text-chalk hover:border-chalk">Beratung und Support</Link>
            </>}
          </div>
        </Panel>
        {ok && p.membership && <MemberCard m={p.membership} name={user.fullName ?? ''} />}
      </div>
    </PageShell>
  )
}
