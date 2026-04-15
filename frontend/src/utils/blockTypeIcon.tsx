import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  BookOpen,
  Briefcase,
  Coffee,
  Dumbbell,
  Moon,
  Sparkles,
  Sun,
  TreePine,
  Video,
} from 'lucide-react'

const map: Record<string, LucideIcon> = {
  football: TreePine,
  gym: Dumbbell,
  ml: Brain,
  content: Video,
  reading: BookOpen,
  work: Briefcase,
  rest: Coffee,
  off: Moon,
  routine: Sun,
  deep: Sparkles,
}

export function BlockTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = map[type.toLowerCase()] ?? Sparkles
  return <Icon className={className} aria-hidden size={18} strokeWidth={2} />
}
