import { useEffect } from 'react'

const SITE_NAME = 'True Doc Pros'
const BASE_URL = 'https://truedocpros.com'

/**
 * Sets document.title, the meta description, and a canonical link tag
 * for the current page. Since this is a client-rendered app (no
 * server-side rendering), this runs on mount for each page — search
 * engines that execute JavaScript (Google, Bing) pick this up during
 * rendering, though crawlers that don't run JS (some social-share
 * bots) will still only see the static tags in index.html.
 */
export default function useDocumentHead({ title, description, path = '' }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
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
    canonical.setAttribute('href', `${BASE_URL}${path}`)
  }, [title, description, path])
}
