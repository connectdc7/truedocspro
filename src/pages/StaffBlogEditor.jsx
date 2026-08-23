import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function StaffBlogEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('True Doc Pros Team')
  const [published, setPublished] = useState(true)
  const [initialPublished, setInitialPublished] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notifyResult, setNotifyResult] = useState(null)

  useEffect(() => {
    if (isNew) return
    supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else {
          setTitle(data.title)
          setSlug(data.slug)
          setExcerpt(data.excerpt ?? '')
          setContent(data.content)
          setAuthor(data.author)
          setPublished(data.published)
          setInitialPublished(data.published)
          setSlugEdited(true)
        }
        setLoading(false)
      })
  }, [id, isNew])

  const handleTitleChange = (val) => {
    setTitle(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setNotifyResult(null)
    const payload = { title, slug, excerpt, content, author, published }

    const { error } = isNew
      ? await supabase.from('posts').insert(payload)
      : await supabase.from('posts').update(payload).eq('id', id)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }

    // Only notify subscribers the moment a post actually becomes published
    // — not on every subsequent edit to an already-published post.
    const isNewlyPublished = published && (isNew || !initialPublished)
    if (isNewlyPublished) {
      const { data, error: notifyError } = await supabase.functions.invoke('notify-subscribers-new-post', {
        body: { title, slug, excerpt },
      })
      if (!notifyError && data) {
        setNotifyResult(`Notified ${data.sent} of ${data.total} subscribers.`)
        setTimeout(() => navigate('/staff/blog'), 1500)
        return
      }
    }

    navigate('/staff/blog')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post permanently?')) return
    await supabase.from('posts').delete().eq('id', id)
    navigate('/staff/blog')
  }

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-6 py-20 text-center font-mono text-sm text-[var(--slate)]">Loading…</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-6 py-16">
        <Link to="/staff/blog" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
          ← Blog posts
        </Link>

        <h1 className="font-display mt-4 text-3xl font-semibold text-[var(--ink)]">
          {isNew ? 'New post' : 'Edit post'}
        </h1>

        <div className="mt-8 space-y-5">
          <Field label="Title" value={title} onChange={handleTitleChange} />

          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">URL slug</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value))
                setSlugEdited(true)
              }}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm font-mono outline-none focus:border-[var(--wax)]"
            />
            <p className="mt-1.5 text-xs text-[var(--slate)]">Will be published at truedocpros.com/blog/{slug || '…'}</p>
          </div>

          <Field label="Excerpt (shown on the blog list)" value={excerpt} onChange={setExcerpt} textarea rows={2} />
          <Field label="Content (supports **bold**, headings with ##, and lists)" value={content} onChange={setContent} textarea rows={16} />
          <Field label="Author" value={author} onChange={setAuthor} />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-[var(--wax)]"
            />
            <span className="text-sm text-[var(--ink)]">Published (visible on the public blog)</span>
          </label>

          {error && <p className="text-sm text-[var(--wax)]">{error}</p>}
          {notifyResult && <p className="text-sm text-[var(--brass)]">{notifyResult}</p>}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !title || !slug || !content}
              className="rounded-full bg-[var(--wax)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : isNew ? 'Publish post' : 'Save changes'}
            </button>
            {!isNew && (
              <button onClick={handleDelete} className="text-sm text-[var(--wax)] hover:underline">
                Delete post
              </button>
            )}
          </div>
        </div>
      </section>
    </Layout>
  )
}

function Field({ label, value, onChange, textarea, rows }) {
  const props = {
    value,
    onChange: (e) => onChange(e.target.value),
    className:
      'mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]',
  }
  return (
    <div>
      <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">{label}</label>
      {textarea ? <textarea rows={rows} {...props} /> : <input {...props} />}
    </div>
  )
}
