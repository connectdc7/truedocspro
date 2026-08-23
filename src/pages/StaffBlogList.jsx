import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

export default function StaffBlogList() {
  const [tab, setTab] = useState('posts') // 'posts' | 'subscribers'

  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)

  const [subscribers, setSubscribers] = useState([])
  const [subscribersLoading, setSubscribersLoading] = useState(true)
  const [subscriberSearch, setSubscriberSearch] = useState('')

  useEffect(() => {
    loadPosts()
    loadSubscribers()
  }, [])

  async function loadPosts() {
    setPostsLoading(true)
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    setPosts(data ?? [])
    setPostsLoading(false)
  }

  async function loadSubscribers() {
    setSubscribersLoading(true)
    const { data } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false })
    setSubscribers(data ?? [])
    setSubscribersLoading(false)
  }

  const filteredSubscribers = subscribers.filter((s) =>
    s.email?.toLowerCase().includes(subscriberSearch.trim().toLowerCase())
  )

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Staff</p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[var(--ink)]">Blog</h1>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setTab('posts')}
              className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
                tab === 'posts'
                  ? 'bg-[var(--ink)] text-[var(--parchment)]'
                  : 'border border-[var(--line)] text-[var(--slate)] hover:border-[var(--wax)]'
              }`}
            >
              Posts ({posts.length})
            </button>
            <button
              onClick={() => setTab('subscribers')}
              className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
                tab === 'subscribers'
                  ? 'bg-[var(--ink)] text-[var(--parchment)]'
                  : 'border border-[var(--line)] text-[var(--slate)] hover:border-[var(--wax)]'
              }`}
            >
              Subscribers ({subscribers.length})
            </button>
          </div>
        </div>
      </section>

      {tab === 'posts' ? (
        <section className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center justify-end">
            <Link
              to="/staff/blog/new"
              className="rounded-full bg-[var(--wax)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors"
            >
              + New post
            </Link>
          </div>

          {postsLoading && <p className="mt-6 font-mono text-sm text-[var(--slate)]">Loading…</p>}
          <div className="mt-6 grid gap-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/staff/blog/${p.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/40 px-5 py-4 hover:border-[var(--wax)] transition-colors"
              >
                <div>
                  <p className="font-medium text-[var(--ink)]">{p.title}</p>
                  <p className="font-mono text-xs text-[var(--slate)]">
                    {new Date(p.created_at).toLocaleDateString()} · /blog/{p.slug}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-xs uppercase ${
                    p.published ? 'bg-[var(--wax)]/15 text-[var(--wax)]' : 'bg-[var(--line)] text-[var(--slate)]'
                  }`}
                >
                  {p.published ? 'Published' : 'Draft'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-4xl px-6 py-10">
          <input
            type="text"
            placeholder="Search by email…"
            value={subscriberSearch}
            onChange={(e) => setSubscriberSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
          />

          {subscribersLoading && <p className="mt-6 font-mono text-sm text-[var(--slate)]">Loading…</p>}
          {!subscribersLoading && filteredSubscribers.length === 0 && (
            <p className="mt-6 font-mono text-sm text-[var(--slate)]">No subscribers yet.</p>
          )}

          <div className="mt-6 overflow-hidden rounded-xl border border-[var(--line)]">
            {filteredSubscribers.map((s) => (
              <Link
                key={s.id}
                to={`/staff/subscribers/${s.id}`}
                className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 last:border-0 hover:bg-white/40 transition-colors"
              >
                <span className="text-sm text-[var(--ink)]">{s.email}</span>
                <span className="font-mono text-xs text-[var(--slate)]">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Layout>
  )
}
