import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import useDocumentHead from '../lib/useDocumentHead'

const DETAIL = [
  {
    id: 'notary',
    name: 'Notary',
    price: 'From $25 / document',
    expedited: 'Expedited (at least 1 business day): +$15',
    desc: 'A licensed notary public witnesses your signature and verifies your identity — in person at a partner location or remotely online, depending on your state.',
    good: ['Powers of attorney', 'Affidavits', 'Loan and property documents', 'Consent letters'],
  },
  {
    id: 'apostille',
    name: 'Apostille',
    price: 'From $85 / document',
    expedited: 'Expedited (1–2 business days): +$40',
    desc: 'An apostille is a single certificate recognized by every Hague Apostille Convention member country — no embassy visit required. We handle the state-level authentication for you.',
    good: ['Birth, marriage, and death certificates', 'Diplomas and transcripts', 'Corporate documents', 'FBI background checks'],
  },
  {
    id: 'embassy',
    name: 'Embassy legalization',
    price: 'From $150 / document',
    expedited: 'Expedited (2–4 weeks): +$75',
    desc: 'For countries outside the Hague Convention, documents need a full chain of authentication: county or state, then the U.S. Department of State, then the destination country\u2019s embassy or consulate.',
    good: ['Documents bound for non-Hague countries', 'Commercial invoices and certificates of origin', 'Adoption paperwork', 'Multi-country document chains'],
  },
]

export default function Services() {
  useDocumentHead({
    title: 'Services & Pricing — Notary, Apostille, Embassy Legalization',
    description:
      'Notary from $25, apostille from $85, embassy legalization from $150. See pricing and turnaround times for each document service.',
    path: '/services',
  })
  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--wax)]">Services &amp; pricing</p>
        <h1 className="font-display mt-3 text-4xl font-semibold text-[var(--ink)]">
          Three ways to certify a document, one place to track it.
        </h1>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 space-y-16">
        {DETAIL.map((s) => (
          <div key={s.id} id={s.id} className="grid gap-8 border-b border-[var(--line)] pb-16 last:border-0 md:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">{s.name}</h2>
              <p className="mt-2 font-mono text-sm text-[var(--brass)]">{s.price}</p>
              <p className="mt-1 font-mono text-xs text-[var(--slate)]">{s.expedited}</p>
              <Link
                to="/signup"
                className="mt-6 inline-block rounded-full border border-[var(--ink)]/25 px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
              >
                Submit for {s.name.toLowerCase()}
              </Link>
            </div>
            <div>
              <p className="text-[15px] leading-relaxed text-[var(--slate)]">{s.desc}</p>
              <p className="mt-5 font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Common documents</p>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {s.good.map((g) => (
                  <li key={g} className="flex items-start gap-2 text-sm text-[var(--ink)]/85">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wax)]" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>
    </Layout>
  )
}
