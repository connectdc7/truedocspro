import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

export default function StaffBlogList() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Staff</p>
            <h1 className="font-display mt-1 text-3xl font-semibold text-[var(--ink)]">Blog posts</h1>
          </div>
          <Link
            to="/staff/blog/new"
            className="rounded-full bg-[var(--wax)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors"
          >
            + New post
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        {loading && <p className="font-mono text-sm text-[var(--slate)]">Loading…</p>}
        <div className="grid gap-3">
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
    </Layout>
  )
}
