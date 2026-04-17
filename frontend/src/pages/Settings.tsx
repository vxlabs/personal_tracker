import { Settings as SettingsIcon, Bell, BellOff, Send, Loader2, Download } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { BlockedSitesSettings } from '@/components/settings/BlockedSitesSettings'
import { ScheduleEditor } from '@/components/settings/ScheduleEditor'
import { isDesktopRuntime } from '@/runtime/config'
import type { NotificationPreferences } from '@/types'

const NOTIFICATION_TYPES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'blockTransition', label: 'Block Transitions', description: '5 min before each schedule block starts' },
  { key: 'habitReminder', label: 'Habit Reminder', description: '"Did you do your lunch walk?" at 13:30' },
  { key: 'dailyReview', label: 'Daily Review', description: '"What 3 things did you learn today?" at 22:30' },
  { key: 'sleepWarning', label: 'Sleep Warning', description: '"30 min to lights out" at 22:45' },
]

export function Settings() {
  const isDesktop = isDesktopRuntime()
  const {
    permission,
    subscribed,
    loading,
    preferences,
    prefsLoading,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTest,
  } = useNotifications({ enabled: !isDesktop })

  const { isInstallable, promptToInstall } = useInstallPrompt(!isDesktop)

  const handleToggle = (key: keyof NotificationPreferences) => {
    updatePreferences({ ...preferences, [key]: !preferences[key] })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-5 w-5 text-text-dim" />
        <h1 className="font-sans text-xl font-semibold text-text-primary">Settings</h1>
      </div>

      {!isDesktop && isInstallable && (
        <section className="rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-sans text-base font-semibold text-text-primary flex items-center gap-2">
              <Download className="h-5 w-5 text-accent-purple" />
              Install Protocol App
            </h2>
            <p className="text-sm font-mono text-text-dim">Install as a standalone app for offline access</p>
          </div>
          <button
            onClick={promptToInstall}
            className="flex items-center gap-2 rounded-md bg-accent-purple px-4 py-2 text-sm font-mono text-white hover:bg-accent-purple/80 transition-colors"
          >
            Install
          </button>
        </section>
      )}

      {/* Push Notifications Section */}
      {!isDesktop && (
        <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-accent-purple" />
              <h2 className="font-sans text-base font-semibold text-text-primary">Push Notifications</h2>
            </div>

            {permission === 'unsupported' ? (
              <span className="text-xs text-text-dim font-mono">Not supported in this browser</span>
            ) : permission === 'denied' ? (
              <span className="text-xs text-red-400 font-mono">Blocked by browser — enable in site settings</span>
            ) : subscribed ? (
              <button
                onClick={unsubscribe}
                disabled={loading}
                className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm font-mono text-text-secondary hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
                Disable
              </button>
            ) : (
              <button
                onClick={subscribe}
                disabled={loading}
                className="flex items-center gap-2 rounded-md bg-accent-purple px-3 py-1.5 text-sm font-mono text-white hover:bg-accent-purple/80 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                Enable Notifications
              </button>
            )}
          </div>

          {subscribed && (
            <>
              <div className="h-px bg-border" />

              {prefsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-text-dim" />
                </div>
              ) : (
                <div className="space-y-3">
                  {NOTIFICATION_TYPES.map(({ key, label, description }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between rounded-md border border-border bg-surface-2 p-3 cursor-pointer hover:border-accent-purple/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-sans text-text-primary">{label}</p>
                        <p className="text-xs font-mono text-text-dim mt-0.5">{description}</p>
                      </div>
                      <div className="relative shrink-0 ml-4">
                        <input
                          type="checkbox"
                          checked={preferences[key]}
                          onChange={() => handleToggle(key)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 rounded-full bg-border peer-checked:bg-accent-purple transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-text-dim peer-checked:bg-white peer-checked:translate-x-4 transition-all" />
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="h-px bg-border" />

              <button
                onClick={sendTest}
                className="flex items-center gap-2 text-sm font-mono text-text-secondary hover:text-accent-cyan transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Send test notification
              </button>
            </>
          )}
        </section>
      )}

      {/* Schedule Editor */}
      <ScheduleEditor />

      {/* Blocked Sites Management */}
      <BlockedSitesSettings />
    </div>
  )
}
