export interface VaultSource {
  id: number
  url: string
  title: string
  sourceType: string
  rawFilePath: string
  slug: string
  userNote?: string
  tagsRaw: string
  status: 'captured' | 'compiled' | 'error'
  capturedAt: string
  compiledAt?: string
}

export interface WikiPageMeta {
  id: number
  filePath: string
  title: string
  pageType: string
  summary: string
  tagsRaw: string
  backLinksRaw: string
  confidence: string
  createdAt: string
  updatedAt: string
}

export interface WikiPage extends WikiPageMeta {
  content: string
}

export interface WikiStats {
  totalSources: number
  compiledSources: number
  pendingSources?: number
  failedSources?: number
  totalPages: number
  entityPages: number
  conceptPages: number
  syntaxPages: number
  synthesiPages: number
  lastUpdated?: string
}

export interface WikiSearchResult {
  id: number
  filePath: string
  title: string
  pageType: string
  snippet: string
  rank: number
}

export interface WikiGraphData {
  nodes: { id: string; title: string; pageType: string; backLinkCount: number }[]
  edges: { source: string; target: string }[]
}

export interface CaptureRequest {
  url?: string
  userNote?: string
  title?: string
  tags?: string[]
}

export interface AiSearchResponse {
  answer: string
  citations: { title: string; path: string; relevance: string }[]
  canFile: boolean
}

export interface WikiAgentProfile {
  id: number
  name: string
  provider: string
  executable: string
  argumentsTemplate: string
  model?: string | null
  sendPromptToStdIn: boolean
  isEnabled: boolean
  isDefault: boolean
  timeoutSeconds: number
  createdAt: string
  updatedAt: string
  lastTestedAt?: string | null
  lastTestStatus?: string | null
  lastTestMessage?: string | null
}

export type WikiAgentProfileInput = Omit<
  WikiAgentProfile,
  'id' | 'isDefault' | 'createdAt' | 'updatedAt' | 'lastTestedAt' | 'lastTestStatus' | 'lastTestMessage'
>

export interface WikiAgentStatus {
  configured: boolean
  profile: WikiAgentProfile | null
}
