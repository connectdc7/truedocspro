import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--parchment-dim)]">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <span className="font-display text-lg font-semibold text-[var(--ink)]">
            True Docs <span className="text-[var(--wax)]">Pro</span>
          </span>
          <p className="mt-3 text-sm text-[var(--slate)] max-w-xs">
            Notary, apostille, and embassy legalization, handled document by document, with a paper trail you can see.
          </p>
        </div>
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Services</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/services#notary" className="hover:text-[var(--wax)]">Notary</Link></li>
            <li><Link to="/services#apostille" className="hover:text-[var(--wax)]">Apostille</Link></li>
            <li><Link to="/services#embassy" className="hover:text-[var(--wax)]">Embassy legalization</Link></li>
            <li><Link to="/blog" className="hover:text-[var(--wax)]">Blog &amp; updates</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Client portal</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/signup" className="hover:text-[var(--wax)]">Submit a document</Link></li>
            <li><Link to="/login" className="hover:text-[var(--wax)]">Track status</Link></li>
            <li><Link to="/login" className="hover:text-[var(--wax)]">My documents</Link></li>
            <li><Link to="/app" className="hover:text-[var(--wax)]">Get the app</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-[var(--slate)]">
            <li><a href="mailto:info@truedocspro.com" className="hover:text-[var(--wax)]">info@truedocspro.com</a></li>
            <li><Link to="/contact" className="hover:text-[var(--wax)]">Contact form</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--line)] px-6 py-5 text-center text-xs text-[var(--slate)] font-mono">
        © {new Date().getFullYear()} True Docs Pro. Documents remain accessible in your portal for 30 days after completion.
      </div>
    </footer>
  )
}
