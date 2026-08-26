import { useEffect, useState, useCallback } from 'react'

// Chrome/Edge (desktop and Android) fire this event once, early, and
// only if the site isn't already installed. We have to capture and
// hold onto it here, since it can't be re-triggered later on demand —
// then replay it whenever the user actually clicks "Install app".
//
// iOS Safari never fires this event at all — Apple doesn't allow any
// website to programmatically trigger an install prompt there. On iOS
// the only path is the manual Share → "Add to Home Screen" flow, and
// no code can change that.
export default function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    )

    const handlePrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const handleInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const canInstallDirectly = Boolean(deferredPrompt) && !isStandalone

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null) // each captured event can only be used once
    return choice.outcome // 'accepted' | 'dismissed'
  }, [deferredPrompt])

  return { canInstallDirectly, isStandalone, promptInstall }
}
