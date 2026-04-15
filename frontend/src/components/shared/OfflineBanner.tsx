import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-surface-2 border-b border-border px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4 text-text-dim" />
      <span className="text-sm font-mono text-text-dim">You are currently offline. Changes will sync when reconnected.</span>
    </div>
  )
}
