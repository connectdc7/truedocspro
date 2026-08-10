import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusTracker from '../components/StatusTracker'

export default function HowItWorks() {
  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--wax)]">How it works</p>
        <h1 className="font-display mt-3 text-4xl font-semibold text-[var(--ink)]">
          From upload to certified copy.
        </h1>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-[var(--line)] bg-white/40 p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Example status</p>
          <div className="mt-6">
            <StatusTracker status="in_process" />
          </div>
        </div>

        <div className="mt-14 space-y-10">
          <Step
            n="1"
            title="Create an account and upload your document"
            desc="Sign up with your email, choose the service you need, and upload a clear scan or photo of your document through your secure portal."
          />
          <Step
            n="2"
            title="We review and start processing"
            desc="Your document status moves to Received, then In process while it's notarized, authenticated at the state level, or sent to the relevant embassy."
          />
          <Step
            n="3"
            title="Track it in real time"
            desc="Log in anytime to see exactly where your document is. You'll also get an email when its status changes."
          />
          <Step
            n="4"
            title="Pick up your certified copy"
            desc="Once a document is Ready, download a scanned certified copy directly from your portal, or request it shipped to you."
          />
        </div>

        <div className="mt-14 rounded-2xl border border-[var(--brass)]/40 bg-[var(--parchment-dim)] p-6">
          <h3 className="font-display text-lg font-semibold text-[var(--ink)]">Document retention</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--slate)]">
            Every processed document stays available for secure download in your portal for{' '}
            <strong className="text-[var(--ink)]">30 days</strong> after it's marked Ready. After that window,
            we remove it from active storage — download or request a copy before then if you'll need it again.
          </p>
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/signup"
            className="inline-block rounded-full bg-[var(--wax)] px-8 py-4 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors"
          >
            Create your account
          </Link>
        </div>
      </section>
    </Layout>
  )
}

function Step({ n, title, desc }) {
  return (
    <div className="flex gap-5">
      <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--wax)] text-sm text-[var(--wax)]">
        {n}
      </span>
      <div>
        <h3 className="font-display text-lg font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--slate)]">{desc}</p>
      </div>
    </div>
  )
}
