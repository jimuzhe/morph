export interface AIModelProfile {
  id: string
  baseUrl: string
  apiKey: string
  model: string
}

export interface AIConfig {
  activeModelId: string
  models: AIModelProfile[]
}

/** 发往 API 的运行时配置 */
export interface AIRequestConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const STORAGE_KEY = 'htmlppt-ai-config'

const DEFAULT_MODEL: AIModelProfile = {
  id: 'deepseek-v4-flash',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-v4-flash',
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  activeModelId: DEFAULT_MODEL.id,
  models: [DEFAULT_MODEL],
}

export function createModelId(): string {
  return `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function normalizeAIApiBaseUrl(url: string): string {
  const base = url.replace(/\/+$/, '')
  if (base.endsWith('/v1') || base.endsWith('/v4')) return base
  if (base.includes('deepseek.com')) return `${base}/v1`
  return base
}

export function getActiveModelProfile(config: AIConfig): AIModelProfile {
  const found = config.models.find((m) => m.id === config.activeModelId)
  if (found) return found
  if (config.models.length > 0) return config.models[0]
  return { ...DEFAULT_MODEL }
}

export function getModelDisplayLabel(config: AIConfig): string {
  const profile = getActiveModelProfile(config)
  return profile.model || '未配置'
}

export function toRequestConfig(config: AIConfig): AIRequestConfig {
  const profile = getActiveModelProfile(config)
  return {
    apiKey: profile.apiKey,
    baseUrl: profile.baseUrl,
    model: profile.model,
  }
}

type LegacyStoredProfile = Partial<AIModelProfile> & {
  label?: string
}

type LegacyStored = Partial<AIConfig> & {
  apiKey?: string
  baseUrl?: string
  model?: string
  models?: LegacyStoredProfile[]
}

function normalizeProfile(
  raw: LegacyStoredProfile,
  fallbackApiKey = '',
): AIModelProfile {
  const model = raw.model?.trim() || raw.label?.trim() || ''
  return {
    id: raw.id || createModelId(),
    baseUrl: raw.baseUrl?.trim() || DEFAULT_MODEL.baseUrl,
    apiKey: raw.apiKey?.trim() || fallbackApiKey,
    model,
  }
}

function migrateStoredConfig(stored: LegacyStored | undefined): AIConfig {
  const fallbackKey = stored?.apiKey?.trim() || ''

  if (stored?.models && stored.models.length > 0) {
    const models = stored.models.map((m) => normalizeProfile(m, fallbackKey))
    const activeId =
      stored.activeModelId && models.some((m) => m.id === stored.activeModelId)
        ? stored.activeModelId
        : models[0].id
    return { activeModelId: activeId, models }
  }

  const legacyId = createModelId()
  const model = stored?.model?.trim() || DEFAULT_MODEL.model
  const baseUrl = stored?.baseUrl?.trim() || DEFAULT_MODEL.baseUrl

  return {
    activeModelId: legacyId,
    models: [{ id: legacyId, model, baseUrl, apiKey: fallbackKey }],
  }
}

export async function loadAIConfig(): Promise<AIConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return migrateStoredConfig(result[STORAGE_KEY] as LegacyStored | undefined)
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: config })
}
