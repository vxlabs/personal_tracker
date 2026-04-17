export interface RuntimeConfig {
  isDesktop: boolean
  apiBaseUrl: string
}

const DEFAULT_CONFIG: RuntimeConfig = {
  isDesktop: false,
  apiBaseUrl: '/api',
}

let runtimeConfig = DEFAULT_CONFIG
let initialized = false

export async function initializeRuntimeConfig(): Promise<RuntimeConfig> {
  if (initialized) {
    return runtimeConfig
  }

  try {
    const desktopConfig = await window.protocolDesktop?.getRuntimeConfig?.()
    if (desktopConfig) {
      runtimeConfig = desktopConfig
    }
  } catch (error) {
    console.error('Failed to read desktop runtime config:', error)
  }

  initialized = true
  return runtimeConfig
}

export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig
}

export function isDesktopRuntime(): boolean {
  return runtimeConfig.isDesktop
}
