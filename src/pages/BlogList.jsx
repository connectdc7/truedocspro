import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import SubscribeForm from '../components/SubscribeForm'
import { supabase } from '../lib/supabaseClient'

// Curated external links — update this list periodically to keep the
// "In the news" section current. Ask your developer (or Claude) to
// refresh these every so often with the latest coverage.
const NEWS_LINKS = [
  {
    title: 'US Begins Issuing Electronic Apostilles (e-Apostilles)',
    source: 'VisaMet',
    url: 'https://visamet.com/guides/apostille-document-legalization-visa-guide-2026',
  },
  {
    title: 'Hague Apostille Convention: 2026 Certification Guide — 130 Member Countries',
    source: 'Mayo Law',
    url: 'https://mayo.law/hague-apostille-convention/',
  },
  {
    title: 'Remote Online Notarization Laws by State (2026)',
    source: 'NotaryLive',
    url: 'https://notarylive.com/blog/does-my-state-allow-remote-online-notarization',
  },
  {
    title: 'USCIS Policy Memoranda — official updates',
    source: 'USCIS.gov',
    url: 'https://www.uscis.gov/laws-and-policy/policy-memoranda',
  },
]

export default function BlogList() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('posts')
      .select('slug, title, excerpt, author, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPosts(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--wax)]">Blog &amp; updates</p>
        <h1 className="font-display mt-3 text-4xl font-semibold text-[var(--ink)]">
          Notary, apostille &amp; immigration news.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[var(--slate)]">
          Policy changes, new Hague Convention members, and plain-English explainers — free, straight to your inbox.
        </p>
        <div className="mx-auto mt-6 max-w-md">
          <SubscribeForm />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr]">
          <div>
            {loading && <p className="font-mono text-sm text-[var(--slate)]">Loading…</p>}
            {!loading && posts.length === 0 && (
              <p className="font-mono text-sm text-[var(--slate)]">No posts yet — check back soon.</p>
            )}
            <div className="space-y-8">
              {posts.map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="block rounded-2xl border border-[var(--line)] bg-white/40 p-6 hover:border-[var(--wax)] transition-colors"
                >
                  <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
                    {new Date(p.created_at).toLocaleDateString()} · {p.author}
                  </p>
                  <h2 className="font-display mt-2 text-xl font-semibold text-[var(--ink)]">{p.title}</h2>
                  {p.excerpt && <p className="mt-2 text-sm text-[var(--slate)]">{p.excerpt}</p>}
                  <span className="mt-3 inline-block font-mono text-xs text-[var(--wax)]">Read more →</span>
                </Link>
              ))}
            </div>
          </div>

          <aside>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">In the news</p>
            <div className="mt-4 space-y-4">
              {NEWS_LINKS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-[var(--line)] p-4 hover:border-[var(--wax)] transition-colors"
                >
                  <p className="text-sm font-medium text-[var(--ink)]">{link.title}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--slate)]">{link.source} ↗</p>
                </a>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  )
}
