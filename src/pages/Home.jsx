import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import WaxSeal from '../components/WaxSeal'
import HeroGraphic from '../components/HeroGraphic'

const SERVICES = [
  {
    id: 'notary',
    name: 'Notary',
    desc: 'A commissioned notary witnesses your signature and confirms your identity, in person or online.',
    turnaround: 'Same day',
  },
  {
    id: 'apostille',
    name: 'Apostille',
    desc: 'Authentication for use in any of the 120+ Hague Convention member countries. One certificate, no embassy visit.',
    turnaround: '3–7 business days',
  },
  {
    id: 'embassy',
    name: 'Embassy legalization',
    desc: 'Full chain legalization for countries outside the Hague Convention — county, state, and embassy authentication.',
    turnaround: '2–4 weeks',
  },
]

export default function Home() {
  return (
    <Layout>
      {/* Hero */}
      <section className="paper-texture relative overflow-hidden border-b border-[var(--line)]">
        <HeroGraphic className="right-[-120px] top-[-80px] hidden md:block" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="ink-spread font-mono text-xs uppercase tracking-[0.2em] text-[var(--wax)]">
              Notary · Apostille · Embassy Legalization
            </p>
            <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.1] text-[var(--ink)] md:text-5xl">
              Your documents, certified and accounted for —
              <span className="text-[var(--wax)]"> at every stage.</span>
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[var(--slate)]">
              Submit your documents securely online, watch each one move through notarization,
              authentication, or embassy legalization, and pick up certified copies whenever you need them.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors"
              >
                Submit a document
              </Link>
              <Link
                to="/services"
                className="rounded-full border border-[var(--ink)]/25 px-7 py-3.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
              >
                See services
              </Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <WaxSeal label="TRUE • VERIFIED" />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex items-end justify-between gap-6">
          <h2 className="font-display text-3xl font-semibold text-[var(--ink)]">What we process</h2>
          <Link to="/services" className="font-mono text-xs uppercase tracking-widest text-[var(--wax)] hover:underline">
            Full pricing →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.id} id={s.id} className="rounded-2xl border border-[var(--line)] bg-white/40 p-7">
              <h3 className="font-display text-xl font-semibold text-[var(--ink)]">{s.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--slate)]">{s.desc}</p>
              <p className="mt-5 font-mono text-xs uppercase tracking-widest text-[var(--brass)]">
                Turnaround: {s.turnaround}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Process / status rail */}
      <section className="border-y border-[var(--line)] bg-[var(--parchment-dim)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl font-semibold text-[var(--ink)]">How a document moves through us</h2>
          <div className="status-rail relative mt-14 grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-y-0">
            {[
              ['Received', 'We confirm your upload and check it against requirements for your destination country.'],
              ['In process', 'Notarized, authenticated, or sent to the relevant embassy — tracked in real time.'],
              ['Ready', 'Your certified document is ready for pickup, mail, or secure download.'],
              ['Shipped / Returned', 'On its way to you, or already downloaded from your portal.'],
            ].map(([title, desc], i) => (
              <div key={title} className="relative flex flex-col items-start gap-3 pt-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--wax)] bg-[var(--parchment)] font-mono text-xs text-[var(--wax)]">
                  {i + 1}
                </span>
                <h3 className="font-display text-base font-semibold text-[var(--ink)]">{title}</h3>
                <p className="max-w-[220px] text-sm text-[var(--slate)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-semibold text-[var(--ink)] md:text-4xl">
          Every document gets a paper trail you can actually see.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[var(--slate)]">
          Create a free account, upload your first document, and track it from received to returned.
        </p>
        <Link
          to="/signup"
          className="mt-8 inline-block rounded-full bg-[var(--wax)] px-8 py-4 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors"
        >
          Get started
        </Link>
      </section>
    </Layout>
  )
}
