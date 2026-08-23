export function getContextualMenu(pathname, { isStaff, isAdmin }) {
  // Viewing a specific staff order
  if (pathname.startsWith('/staff/orders/')) {
    return {
      section: 'This order',
      items: [
        { to: '/staff', label: '← All documents' },
        ...(isAdmin
          ? [
              { to: '/staff/sos-fees', label: 'SOS fees' },
              { to: '/staff/embassy-fees', label: 'Embassy fees' },
              { to: '/staff/shipping-fees', label: 'Shipping fees' },
              { to: '/staff/blog', label: 'Manage blog' },
              { to: '/staff/team', label: 'Team Members' },
            ]
          : []),
      ],
    }
  }
  // Team page
  if (pathname === '/staff/team') {
    return {
      section: 'Staff tools',
      items: [
        { to: '/staff', label: '← Staff dashboard' },
        { to: '/blog', label: 'View public blog' },
      ],
    }
  }
  // Fee schedule pages — cross-link to the other two
  if (pathname === '/staff/embassy-fees' || pathname === '/staff/sos-fees' || pathname === '/staff/shipping-fees') {
    const feeLinks = [
      { to: '/staff/sos-fees', label: 'SOS fees' },
      { to: '/staff/embassy-fees', label: 'Embassy fees' },
      { to: '/staff/shipping-fees', label: 'Shipping fees' },
    ]
    return {
      section: 'Fee schedules',
      items: [
        { to: '/staff', label: '← Staff dashboard' },
        ...feeLinks,
      ],
    }
  }
  // Blog management pages (posts + subscribers both live here now)
  if (pathname.startsWith('/staff/blog')) {
    return {
      section: 'Blog management',
      items: [
        { to: '/staff', label: '← Staff dashboard' },
        { to: '/staff/blog/new', label: '+ New post' },
        { to: '/blog', label: 'View public blog' },
      ],
    }
  }
  // Individual subscriber detail page
  if (pathname.startsWith('/staff/subscribers')) {
    return {
      section: 'Subscribers',
      items: [
        { to: '/staff/blog', label: '← Blog & subscribers' },
        { to: '/staff', label: 'Staff dashboard' },
      ],
    }
  }
  // Staff dashboard itself
  if (pathname === '/staff') {
    const items = []
    if (isAdmin) {
      items.push(
        { to: '/staff/sos-fees', label: 'SOS fees' },
        { to: '/staff/embassy-fees', label: 'Embassy fees' },
        { to: '/staff/shipping-fees', label: 'Shipping fees' },
        { to: '/staff/blog', label: 'Manage blog' },
        { to: '/staff/team', label: 'Team Members' }
      )
    }
    items.push({ to: '/portal', label: 'My documents' })
    return { section: 'Staff tools', items }
  }
  // Viewing a specific client order
  if (pathname.startsWith('/portal/orders/')) {
    return {
      section: 'This document',
      items: [
        { to: '/portal', label: '← My documents' },
        { to: '/portal/new', label: 'Submit another document' },
        { to: '/app', label: 'Get the app' },
        { to: '/contact', label: 'Questions? Contact us' },
      ],
    }
  }
  // Submitting a new document
  if (pathname === '/portal/new') {
    return {
      section: 'Submitting a document',
      items: [
        { to: '/portal', label: 'My documents' },
        { to: '/services', label: 'View pricing' },
        { to: '/contact', label: 'Questions? Contact us' },
      ],
    }
  }
  // Client portal dashboard
  if (pathname === '/portal') {
    const items = [{ to: '/portal/new', label: '+ Submit a document' }]
    if (isStaff) items.push({ to: '/staff', label: 'Staff dashboard' })
    items.push({ to: '/app', label: 'Get the app' }, { to: '/blog', label: 'Blog & updates' })
    return { section: 'Your documents', items }
  }
  // Blog
  if (pathname.startsWith('/blog')) {
    return {
      section: 'Blog',
      items: [
        { to: '/portal/new', label: 'Submit a document' },
        { to: '/portal', label: 'My documents' },
        { to: '/services', label: 'View pricing' },
      ],
    }
  }
  // Marketing pages: home, services, how-it-works, contact, app install
  const items = [
    { to: '/portal/new', label: 'Submit a document' },
    { to: '/portal', label: 'My documents' },
  ]
  if (isStaff) items.push({ to: '/staff', label: 'Staff dashboard' })
  items.push({ to: '/app', label: 'Get the app' }, { to: '/blog', label: 'Blog & updates' })
  return { section: 'Quick links', items }
}
