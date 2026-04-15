import { Target } from 'lucide-react'
import { HabitsSection } from '@/components/dashboard/HabitsSection'
import { useHabits } from '@/hooks/useHabits'

export function Habits() {
  const { habits, loading, toggle } = useHabits()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-5 w-5 text-block-football" />
        <h1 className="font-sans text-xl font-semibold text-text-primary">Habits</h1>
      </div>
      <HabitsSection habits={habits} loading={loading} onToggle={toggle} />
    </div>
  )
}
