import { useEffect } from 'react'

const SITE_NAME = 'True Doc Pros'
const BASE_URL = 'https://truedocpros.com'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`

function setMeta(attr, key, content) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * Sets document.title, the meta description, a canonical link tag, and
 * per-page Open Graph / Twitter Card tags for the current page. Since
 * this is a client-rendered app (no server-side rendering), this runs
 * on mount for each page — search engines that execute JavaScript
 * (Google, Bing) pick this up during rendering, though crawlers that
 * don't run JS (some social-share bots) will still only see the
 * static tags in index.html.
 */
export default function useDocumentHead({ title, description, path = '', image = DEFAULT_IMAGE }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const fullUrl = `${BASE_URL}${path}`
    document.title = fullTitle

    if (description) {
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', description)
    }

    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', fullUrl)

    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:url', fullUrl)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:image', image)
    if (description) {
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
  }, [title, description, path, image])
}
