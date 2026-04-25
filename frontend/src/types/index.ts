export interface BlockDto {
  id: number
  dayOfWeek: string
  startTime: string
  endTime: string
  type: string
  label: string
  note: string | null
  isFocusBlock: boolean
  sortOrder: number
}

export interface NowResponse {
  currentBlock: BlockDto | null
  nextBlock: BlockDto | null
  minutesRemaining: number
  percentComplete: number
  currentTimeIst: string
}

export interface BlockInput {
  startTime: string
  endTime: string
  type: string
  label: string
  note: string | null
  isFocusBlock: boolean
}

export const BLOCK_TYPES = [
  'football', 'gym', 'ml', 'content', 'reading', 'work', 'rest', 'off', 'routine', 'deep'
] as const

export type BlockType = typeof BLOCK_TYPES[number]

export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const

export type DayOfWeek = typeof DAYS_OF_WEEK[number]

export interface HabitStatus {
  habitId: number
  key: string
  label: string
  icon: string
  isApplicableToday: boolean
  isCompletedToday: boolean
  currentStreak: number
  longestStreak: number
}

export interface FocusSessionDto {
  id: number
  startedAt: string
  endedAt: string | null
  blockType: string
  blockLabel: string
  durationMinutes: number | null
  isActive: boolean
}

export interface FocusCurrentResponse {
  session: FocusSessionDto | null
  elapsedSeconds: number
}

export interface NotificationPreferences {
  blockTransition: boolean
  habitReminder: boolean
  sleepWarning: boolean
  dailyReview: boolean
}

export interface BlockedSiteDto {
  id: number
  domain: string
  isActive: boolean
}

export interface DailyReviewDto {
  id: number
  date: string
  entry1: string
  entry2: string
  entry3: string
  createdAt: string
}

export interface CalendarEntry {
  date: string
  hasReview: boolean
}

export interface ReviewSearchResult {
  id: number
  date: string
  matchedEntry: string
  entryNumber: number
}

export interface HabitComplianceDto {
  habitId: number
  label: string
  icon: string
  applicableDays: number
  completedDays: number
  compliancePercent: number
  currentStreak: number
  longestStreak: number
}

export interface FocusTypeEntry {
  blockType: string
  hours: number
}

export interface FocusBreakdownDto {
  totalHours: number
  byType: FocusTypeEntry[]
}

export interface WeekDailyReviewDto {
  date: string
  dayName: string
  entry1: string
  entry2: string
  entry3: string
}

export interface WeeklyReportDto {
  week: string
  startDate: string
  endDate: string
  habitCompliance: HabitComplianceDto[]
  focusBreakdown: FocusBreakdownDto
  dailyReviews: (WeekDailyReviewDto | null)[]
  score: number
}

export interface XpDelta {
  totalXp: number
  rankTitle: string
  previousRankTitle: string | null
  rankUp: boolean
  xpGainedThisAction: number
}

export interface XpWeekBar {
  week: string
  totalXp: number
}

export interface XpSummary {
  totalXp: number
  rankTitle: string
  nextRankTitle: string | null
  xpToNextRank: number | null
  weeklyBars: XpWeekBar[]
}

export type ProductivityLabel = 'Productive' | 'Neutral' | 'Distracting' | 'Unclassified'

export interface ActivityBucket {
  key: string
  label: string
  activeSeconds: number
  domain: string | null
  url: string | null
  productivityLabel: ProductivityLabel
  labelSource: string
  predictionConfidence: number | null
  title?: string | null
}

export interface DomainGroup {
  domain: string
  totalSeconds: number
  productivityLabel: ProductivityLabel
  labelSource: string
  predictionConfidence: number | null
  urls: ActivityBucket[]
}

export interface ActivitySession {
  id: number
  sessionKey: string
  url: string
  domain: string
  title: string | null
  startedAtUtc: string
  lastSeenAtUtc: string
  endedAtUtc: string | null
  activeSeconds: number
  productivityLabel: ProductivityLabel
  labelSource: string
  predictionConfidence: number | null
}

export interface ActivityMlStatus {
  hasModel: boolean
  modelPath: string | null
  lastTrainedAtUtc: string | null
  lastTrainingSucceeded: boolean
  lastTrainingMessage: string | null
  labelCounts: Record<string, number>
}

export interface ActivitySummary {
  period: string
  startUtc: string
  endUtc: string
  totalSeconds: number
  byLabel: ActivityBucket[]
  domainGroups: DomainGroup[]
  unclassified: ActivitySession[]
  model: ActivityMlStatus
}

export interface ActivityTrainResult {
  succeeded: boolean
  message: string
  productiveCount: number
  neutralCount: number
  distractingCount: number
  trainingExampleCount: number
  startedAtUtc: string
  completedAtUtc: string | null
}
