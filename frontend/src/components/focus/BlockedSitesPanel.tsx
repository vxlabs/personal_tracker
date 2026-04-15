import { ShieldAlert } from 'lucide-react'
import type { BlockedSiteDto } from '@/types'

interface BlockedSitesPanelProps {
  sites: BlockedSiteDto[]
  loading: boolean
  accentColor: string
}

export function BlockedSitesPanel({ sites, loading, accentColor }: BlockedSitesPanelProps) {
  const activeSites = sites.filter((s) => s.isActive)

  if (loading || activeSites.length === 0) return null

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm rounded-xl border px-5 py-4"
      style={{
        borderColor: `${accentColor}25`,
        background: 'color-mix(in srgb, var(--color-surface-1) 85%, transparent)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={14} style={{ color: accentColor }} />
        <span
          className="font-mono text-xs font-semibold uppercase tracking-wider"
          style={{ color: accentColor }}
        >
          Stay away from
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeSites.map((site) => (
          <span
            key={site.id}
            className="inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs text-text-secondary"
            style={{ borderColor: `${accentColor}20`, background: `${accentColor}08` }}
          >
            {site.domain}
          </span>
        ))}
      </div>
    </div>
  )
}
