import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type {
  VaultSource,
  WikiPageMeta,
  WikiPage,
  WikiStats,
  WikiSearchResult,
  WikiGraphData,
  CaptureRequest,
  AiSearchResponse,
  WikiAgentProfile,
  WikiAgentProfileInput,
  WikiAgentStatus,
} from '@/types/wiki'

interface XpDelta {
  totalXp: number
  rankTitle: string
  previousRankTitle: string | null
  rankUp: boolean
  xpGainedThisAction: number
}

interface CaptureResponse {
  source: VaultSource
  xp: XpDelta
}

interface CompileResponse {
  status: string
  xp: XpDelta
}

export function useWikiStats() {
  const [stats, setStats] = useState<WikiStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<WikiStats>(API_ENDPOINTS.WIKI_STATS)
      setStats(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { stats, loading, refresh }
}

export function useWikiSources() {
  const [sources, setSources] = useState<VaultSource[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<VaultSource[]>(API_ENDPOINTS.WIKI_SOURCES)
      setSources(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const capture = useCallback(async (req: CaptureRequest): Promise<XpDelta | null> => {
    const { data } = await api.post<CaptureResponse>(API_ENDPOINTS.WIKI_CAPTURE, req)
    await refresh()
    return data.xp ?? null
  }, [refresh])

  const deleteSource = useCallback(async (id: number) => {
    await api.delete(API_ENDPOINTS.wikiSource(id))
    await refresh()
  }, [refresh])

  const compile = useCallback(async (id: number): Promise<XpDelta | null> => {
    try {
      const { data } = await api.post<CompileResponse>(API_ENDPOINTS.wikiCompile(id))
      return data.xp ?? null
    } finally {
      await refresh()
    }
  }, [refresh])

  return { sources, loading, refresh, capture, deleteSource, compile }
}

export function useWikiRecent() {
  const [pages, setPages] = useState<WikiPageMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<WikiPageMeta[]>(API_ENDPOINTS.WIKI_RECENT)
      .then(({ data }) => setPages(data))
      .finally(() => setLoading(false))
  }, [])

  return { pages, loading }
}

export function useWikiIndex() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<string>(API_ENDPOINTS.WIKI_INDEX)
      .then(({ data }) => setContent(data))
      .finally(() => setLoading(false))
  }, [])

  return { content, loading }
}

export function useWikiPage(filePath: string | null) {
  const [page, setPage] = useState<WikiPage | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filePath) { setPage(null); return }
    setLoading(true)
    api.get<WikiPage>(API_ENDPOINTS.WIKI_PAGE, { params: { path: filePath } })
      .then(({ data }) => setPage(data))
      .finally(() => setLoading(false))
  }, [filePath])

  return { page, loading }
}

export function useWikiSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WikiSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.get<WikiSearchResult[]>(API_ENDPOINTS.WIKI_SEARCH, { params: { q } })
      setResults(data)
    } finally {
      setLoading(false)
    }
  }, [])

  return { query, results, loading, search }
}

export function useWikiAiSearch() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiSearchResponse | null>(null)
  const [error, setError] = useState('')

  const aiSearch = useCallback(async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post<AiSearchResponse>(API_ENDPOINTS.WIKI_SEARCH_AI, { query })
      setResult(data)
    } catch {
      setError('AI search failed. Check your wiki AI agent configuration.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fileSynthesis = useCallback(async (query: string, answer: string) => {
    const { data } = await api.post<{ path: string; filePath?: string }>(API_ENDPOINTS.WIKI_SEARCH_AI_FILE, { query, answer })
    return data.filePath ?? data.path
  }, [])

  return { result, loading, error, aiSearch, fileSynthesis }
}

export function useWikiAgentStatus() {
  const [status, setStatus] = useState<WikiAgentStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<WikiAgentStatus>(API_ENDPOINTS.WIKI_AGENT_STATUS)
      setStatus(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { status, loading, refresh }
}

export function useWikiAgentProfiles() {
  const [profiles, setProfiles] = useState<WikiAgentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<WikiAgentProfile[]>(API_ENDPOINTS.WIKI_AGENT_PROFILES)
      setProfiles(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const saveProfile = useCallback(async (profile: WikiAgentProfileInput, id?: number) => {
    if (id) {
      await api.put(API_ENDPOINTS.wikiAgentProfile(id), profile)
    } else {
      await api.post(API_ENDPOINTS.WIKI_AGENT_PROFILES, profile)
    }
    await refresh()
  }, [refresh])

  const deleteProfile = useCallback(async (id: number) => {
    await api.delete(API_ENDPOINTS.wikiAgentProfile(id))
    await refresh()
  }, [refresh])

  const setDefault = useCallback(async (id: number) => {
    await api.post(API_ENDPOINTS.wikiAgentSetDefault(id))
    await refresh()
  }, [refresh])

  const testProfile = useCallback(async (id: number) => {
    setTestingId(id)
    try {
      await api.post(API_ENDPOINTS.wikiAgentTest(id))
      await refresh()
    } finally {
      setTestingId(null)
    }
  }, [refresh])

  return { profiles, loading, testingId, refresh, saveProfile, deleteProfile, setDefault, testProfile }
}

export function useWikiGraph() {
  const [data, setData] = useState<WikiGraphData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<WikiGraphData>(API_ENDPOINTS.WIKI_GRAPH)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
