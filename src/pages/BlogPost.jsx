import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Layout from '../components/Layout'
import SubscribeForm from '../components/SubscribeForm'
import { supabase } from '../lib/supabaseClient'
import useDocumentHead from '../lib/useDocumentHead'

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useDocumentHead({
    title: post?.title,
    description: post?.excerpt,
    path: `/blog/${slug}`,
  })

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPost(data)
        else setNotFound(true)
        setLoading(false)
      })
  }, [slug])

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-6 py-20 text-center font-mono text-sm text-[var(--slate)]">Loading…</div>
      </Layout>
    )
  }

  if (notFound || !post) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="font-display text-xl text-[var(--ink)]">Post not found.</p>
          <Link to="/blog" className="mt-4 inline-block text-sm text-[var(--wax)] hover:underline">
            ← Back to the blog
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <article className="mx-auto max-w-2xl px-6 py-16">
        <Link to="/blog" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
          ← Blog
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
          {new Date(post.created_at).toLocaleDateString()} · {post.author}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold leading-tight text-[var(--ink)] md:text-4xl">
          {post.title}
        </h1>

        <div className="prose-blog mt-8">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-14 rounded-2xl border border-[var(--line)] bg-[var(--parchment-dim)] p-6">
          <p className="font-display text-lg font-semibold text-[var(--ink)]">Stay ahead of policy changes.</p>
          <p className="mt-1 text-sm text-[var(--slate)]">
            Free updates on apostille, embassy legalization, and immigration news — no spam.
          </p>
          <div className="mt-4">
            <SubscribeForm />
          </div>
        </div>
      </article>
    </Layout>
  )
}
