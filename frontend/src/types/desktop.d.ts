interface ProtocolDesktopRuntimeConfig {
  isDesktop: boolean
  apiBaseUrl: string
}

interface ProtocolDesktopBridge {
  getRuntimeConfig: () => Promise<ProtocolDesktopRuntimeConfig>
  showMainWindow?: () => Promise<void>
  showWidget?: () => Promise<void>
  hideWidget?: () => Promise<void>
  toggleWidget?: () => Promise<void>
}

declare global {
  interface Window {
    protocolDesktop?: ProtocolDesktopBridge
  }
}

export {}
