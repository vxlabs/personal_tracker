import { useState, useEffect } from 'react'
import {
  HelpCircle,
  Code2,
  GitFork,
  FolderOpen,
  FileText,
  ExternalLink,
  Monitor,
  Globe,
  Puzzle,
  Shield,
  BookOpen,
  BarChart3,
  CalendarDays,
  Target,
  BrainCircuit,
  Bug,
  Copy,
  Check,
} from 'lucide-react'
import { isDesktopRuntime } from '@/runtime/config'

const GITHUB_URL = 'https://github.com/vxlabs/personal_tracker'
const APP_VERSION = '1.1.0'

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-4">
      {children}
    </section>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4.5 w-4.5 text-accent-purple shrink-0" />
      <h2 className="font-sans text-base font-semibold text-text-primary">{title}</h2>
    </div>
  )
}

function FeatureRow({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-sans font-medium text-text-primary">{title}</p>
        <p className="text-xs font-mono text-text-dim mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function StepRow({ step, text }: { step: number; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 w-5 h-5 rounded-full bg-accent-purple/15 text-accent-purple text-xs font-mono font-bold flex items-center justify-center mt-0.5">
        {step}
      </span>
      <p className="text-sm font-mono text-text-secondary">{text}</p>
    </div>
  )
}

function LinkButton({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm font-mono text-text-secondary hover:text-accent-purple hover:border-accent-purple/40 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
      <ExternalLink className="h-3 w-3 text-text-dim" />
    </a>
  )
}

export function Help() {
  const isDesktop = isDesktopRuntime()
  const [logPath, setLogPath] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isDesktop) {
      window.protocolDesktop?.getLogPath?.().then(setLogPath).catch(() => {})
    }
  }, [isDesktop])

  const handleOpenLogFolder = () => {
    window.protocolDesktop?.openLogFolder?.()
  }

  const handleCopyLogPath = async () => {
    if (!logPath) return
    try {
      await navigator.clipboard.writeText(logPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access may be restricted
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <HelpCircle className="h-5 w-5 text-text-dim" />
        <h1 className="font-sans text-xl font-semibold text-text-primary">Help</h1>
      </div>

      {/* About */}
      <SectionCard>
        <SectionTitle icon={Monitor} title="About Protocol" />
        <p className="text-sm font-mono text-text-secondary leading-relaxed">
          Protocol is a personal productivity system that helps you enforce daily schedules,
          build habits, track focus sessions, block distracting websites during work blocks,
          and capture knowledge into a personal wiki — all running locally on your machine.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 border border-border px-2.5 py-1 text-xs font-mono text-text-dim">
            v{APP_VERSION}
          </span>
          <LinkButton href={GITHUB_URL} icon={GitFork}>
            GitHub Repository
          </LinkButton>
          <LinkButton href={`${GITHUB_URL}/issues`} icon={Bug}>
            Report an Issue
          </LinkButton>
        </div>
      </SectionCard>

      {/* Features */}
      <SectionCard>
        <SectionTitle icon={BookOpen} title="Features" />
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureRow
            icon={CalendarDays}
            title="Schedule"
            description="Define time blocks for each day of the week with labels and focus modes"
          />
          <FeatureRow
            icon={Shield}
            title="Focus & Site Blocking"
            description="Block distracting sites during focus blocks via the browser extension"
          />
          <FeatureRow
            icon={Target}
            title="Habits"
            description="Track daily habits with a one-click check-off and streak calendar"
          />
          <FeatureRow
            icon={BarChart3}
            title="Activity Tracking"
            description="Automatic website and app time tracking via the browser extension"
          />
          <FeatureRow
            icon={BrainCircuit}
            title="Wiki"
            description="Capture URLs and let an AI agent compile them into a personal knowledge base"
          />
          <FeatureRow
            icon={Globe}
            title="Desktop Widget"
            description="Always-on-top widget showing current block, next block, and habits"
          />
        </div>
      </SectionCard>

      {/* Getting Started */}
      <SectionCard>
        <SectionTitle icon={Puzzle} title="Getting Started" />
        <div className="space-y-3">
          <StepRow step={1} text="Install the Protocol desktop app (you're here!) and let it start the embedded API." />
          <StepRow step={2} text="Install the browser extension from the extension/ folder — load it as an unpacked extension in Chrome or Edge." />
          <StepRow step={3} text="Go to Settings → Schedule Editor and set up your daily time blocks." />
          <StepRow step={4} text="Add blocked sites in Settings → Blocked Sites to enforce during focus blocks." />
          <StepRow step={5} text="The extension auto-tracks your browsing. Check the Activity page to see time spent on each site." />
          <StepRow step={6} text="Use the Dashboard for a daily overview, and Review for weekly reflection." />
        </div>
      </SectionCard>

      {/* Architecture (dev-oriented) */}
      <SectionCard>
        <SectionTitle icon={Monitor} title="Architecture" />
        <p className="text-sm font-mono text-text-secondary leading-relaxed">
          Protocol runs as three components working together:
        </p>
        <div className="space-y-2 pt-1">
          <div className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-3">
            <span className="shrink-0 rounded bg-accent-purple/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-accent-purple uppercase tracking-wider">API</span>
            <p className="text-xs font-mono text-text-dim">
              ASP.NET Core backend (<code className="text-text-secondary">Protocol.Api</code>) — embedded inside the Electron app, auto-started on a random port.
              Stores data in a local vault folder.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-3">
            <span className="shrink-0 rounded bg-accent-cyan/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-accent-cyan uppercase tracking-wider">App</span>
            <p className="text-xs font-mono text-text-dim">
              Electron shell with a React frontend (this window) and a frameless always-on-top widget.
              Communicates with the API over HTTP on localhost.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-3">
            <span className="shrink-0 rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-green-400 uppercase tracking-wider">Ext</span>
            <p className="text-xs font-mono text-text-dim">
              Browser extension (Chrome/Edge/Firefox) — discovers the API port via Native Messaging,
              tracks active tabs, enforces site blocking, and sends heartbeats every 30s.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Diagnostics & Logs (desktop only) */}
      {isDesktop && (
        <SectionCard>
          <SectionTitle icon={FileText} title="Diagnostics & Logs" />
          <p className="text-sm font-mono text-text-secondary leading-relaxed">
            Protocol writes detailed logs to help diagnose issues with the embedded API,
            native messaging registration, and extension connectivity.
            When reporting a bug, attach the log file for faster resolution.
          </p>
          {logPath && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
              <FileText className="h-3.5 w-3.5 text-text-dim shrink-0" />
              <code className="text-xs font-mono text-text-secondary truncate flex-1">{logPath}</code>
              <button
                onClick={handleCopyLogPath}
                className="shrink-0 p-1 rounded hover:bg-surface-1 transition-colors"
                title="Copy path"
              >
                {copied
                  ? <Check className="h-3.5 w-3.5 text-green-400" />
                  : <Copy className="h-3.5 w-3.5 text-text-dim hover:text-text-secondary" />}
              </button>
            </div>
          )}
          <button
            onClick={handleOpenLogFolder}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm font-mono text-text-secondary hover:text-accent-purple hover:border-accent-purple/40 transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Open Log Folder
          </button>
        </SectionCard>
      )}

      {/* Developer */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <SectionTitle icon={Code2} title="Developer" />
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-accent-purple/15 flex items-center justify-center">
            <span className="text-sm font-sans font-bold text-accent-purple">S</span>
          </div>
          <div>
            <p className="text-sm font-sans font-medium text-text-primary">Sadique</p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-text-dim hover:text-accent-purple transition-colors"
            >
              github.com/vxlabs
            </a>
          </div>
        </div>
        <p className="text-xs font-mono text-text-dim leading-relaxed">
          Built with React, Tailwind CSS, Electron, ASP.NET Core, and a Chrome Extension.
          Contributions and feedback welcome — open an issue or PR on GitHub.
        </p>
      </SectionCard>
    </div>
  )
}
