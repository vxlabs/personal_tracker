import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Play, Plus, Save, Star, Terminal, Trash2 } from 'lucide-react'
import { useWikiAgentProfiles } from '@/hooks/useWiki'
import type { WikiAgentProfile, WikiAgentProfileInput } from '@/types/wiki'

const PRESETS: Record<string, WikiAgentProfileInput> = {
  codex: {
    name: 'Codex CLI',
    provider: 'codex',
    executable: 'codex',
    argumentsTemplate: 'exec -C "{vaultRoot}" --skip-git-repo-check --ephemeral -',
    model: '',
    sendPromptToStdIn: true,
    isEnabled: true,
    timeoutSeconds: 120,
  },
  anthropic: {
    name: 'Claude CLI',
    provider: 'anthropic',
    executable: 'claude',
    argumentsTemplate: '-p',
    model: '',
    sendPromptToStdIn: true,
    isEnabled: true,
    timeoutSeconds: 120,
  },
  gemini: {
    name: 'Gemini CLI',
    provider: 'gemini',
    executable: 'gemini',
    argumentsTemplate: '-p',
    model: '',
    sendPromptToStdIn: true,
    isEnabled: true,
    timeoutSeconds: 120,
  },
  ollama: {
    name: 'Ollama',
    provider: 'ollama',
    executable: 'ollama',
    argumentsTemplate: 'run {model}',
    model: 'llama3.1',
    sendPromptToStdIn: true,
    isEnabled: true,
    timeoutSeconds: 180,
  },
  custom: {
    name: 'Custom CLI',
    provider: 'custom',
    executable: '',
    argumentsTemplate: '',
    model: '',
    sendPromptToStdIn: true,
    isEnabled: true,
    timeoutSeconds: 120,
  },
}

function toInput(profile: WikiAgentProfile): WikiAgentProfileInput {
  return {
    name: profile.name,
    provider: profile.provider,
    executable: profile.executable,
    argumentsTemplate: profile.argumentsTemplate,
    model: profile.model ?? '',
    sendPromptToStdIn: profile.sendPromptToStdIn,
    isEnabled: profile.isEnabled,
    timeoutSeconds: profile.timeoutSeconds,
  }
}

export function WikiAgentSettings() {
  const { profiles, loading, testingId, saveProfile, deleteProfile, setDefault, testProfile } = useWikiAgentProfiles()
  const defaultProfile = useMemo(() => profiles.find(p => p.isDefault) ?? profiles[0] ?? null, [profiles])
  const [editingId, setEditingId] = useState<number | undefined>()
  const [form, setForm] = useState<WikiAgentProfileInput>(PRESETS.codex)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (defaultProfile) {
      setEditingId(defaultProfile.id)
      setForm(toInput(defaultProfile))
    }
  }, [defaultProfile])

  const handlePreset = (provider: string) => {
    setEditingId(undefined)
    setForm(PRESETS[provider] ?? PRESETS.custom)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveProfile(form, editingId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-accent-purple" />
          <div>
            <h2 className="font-sans text-base font-semibold text-text-primary">Wiki AI Agent</h2>
            <p className="text-xs font-mono text-text-dim">Choose the default CLI that compiles and searches your vault</p>
          </div>
        </div>
        {defaultProfile && (
          <span className="shrink-0 rounded-full border border-accent-purple/30 bg-accent-purple/10 px-3 py-1 text-xs font-mono text-accent-purple">
            Default: {defaultProfile.name}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-text-dim" />
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {profiles.map(profile => (
              <div key={profile.id} className="rounded-md border border-border bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      setEditingId(profile.id)
                      setForm(toInput(profile))
                    }}
                    className="min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-semibold text-text-primary">{profile.name}</p>
                    <p className="truncate text-xs font-mono text-text-dim">{profile.executable} {profile.argumentsTemplate}</p>
                  </button>
                  {profile.isDefault && <Star className="h-4 w-4 shrink-0 fill-accent-purple text-accent-purple" />}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setDefault(profile.id)}
                    disabled={profile.isDefault}
                    className="rounded-md border border-border px-2 py-1 text-[11px] font-mono text-text-secondary hover:border-accent-purple/40 hover:text-accent-purple disabled:opacity-50"
                  >
                    Set default
                  </button>
                  <button
                    onClick={() => testProfile(profile.id)}
                    disabled={testingId === profile.id}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-mono text-text-secondary hover:border-accent-cyan/40 hover:text-accent-cyan disabled:opacity-50"
                  >
                    {testingId === profile.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Test
                  </button>
                  <button
                    onClick={() => deleteProfile(profile.id)}
                    className="ml-auto rounded-md border border-border px-2 py-1 text-text-dim hover:border-red-400/40 hover:text-red-400"
                    aria-label={`Delete ${profile.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {profile.lastTestStatus && (
                  <p className={`mt-2 text-[11px] font-mono ${profile.lastTestStatus === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    {profile.lastTestStatus === 'ok' ? 'Test passed' : profile.lastTestMessage ?? 'Test failed'}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="h-px bg-border" />

          <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-wide text-text-dim">Preset</p>
              {Object.keys(PRESETS).map(provider => (
                <button
                  key={provider}
                  onClick={() => handlePreset(provider)}
                  className={`block w-full rounded-md border px-3 py-2 text-left text-xs font-mono capitalize transition-colors ${
                    form.provider === provider
                      ? 'border-accent-purple/50 bg-accent-purple/10 text-accent-purple'
                      : 'border-border bg-surface-2 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {provider === 'anthropic' ? 'Claude' : provider}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-mono text-text-dim">Name</span>
                <input className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-purple/50" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-mono text-text-dim">Executable</span>
                <input className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-purple/50" value={form.executable} onChange={e => setForm({ ...form, executable: e.target.value })} placeholder="codex" />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-mono text-text-dim">Arguments template</span>
                <input className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent-purple/50" value={form.argumentsTemplate} onChange={e => setForm({ ...form, argumentsTemplate: e.target.value })} placeholder='exec --cd "{vaultRoot}" -' />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-mono text-text-dim">Model</span>
                <input className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-purple/50" value={form.model ?? ''} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="optional" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-mono text-text-dim">Timeout seconds</span>
                <input type="number" min={10} max={900} className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-purple/50" value={form.timeoutSeconds} onChange={e => setForm({ ...form, timeoutSeconds: Number(e.target.value) })} />
              </label>
              <label className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                <input type="checkbox" checked={form.sendPromptToStdIn} onChange={e => setForm({ ...form, sendPromptToStdIn: e.target.checked })} />
                Send prompt through stdin
              </label>
              <label className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                <input type="checkbox" checked={form.isEnabled} onChange={e => setForm({ ...form, isEnabled: e.target.checked })} />
                Enabled
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setEditingId(undefined)
                setForm(PRESETS.custom)
              }}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-mono text-text-secondary hover:text-text-primary"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.executable.trim()}
              className="flex items-center gap-2 rounded-md bg-accent-purple px-3 py-2 text-sm font-mono text-white hover:bg-accent-purple/80 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {editingId ? 'Save profile' : 'Create profile'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
