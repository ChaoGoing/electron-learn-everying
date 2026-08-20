import { cn } from '../../lib/cn'

const MOODS = [
  { value: 'happy', emoji: '😊', label: '开心' },
  { value: 'excited', emoji: '🤩', label: '兴奋' },
  { value: 'grateful', emoji: '🙏', label: '感恩' },
  { value: 'neutral', emoji: '😐', label: '平静' },
  { value: 'tired', emoji: '😴', label: '疲惫' },
  { value: 'sad', emoji: '😢', label: '难过' },
  { value: 'anxious', emoji: '😰', label: '焦虑' },
  { value: 'angry', emoji: '😤', label: '生气' },
]

interface MoodPickerProps {
  value: string | null
  onChange: (mood: string | null) => void
}

export function MoodPicker({ value, onChange }: MoodPickerProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      {MOODS.map((mood) => (
        <button
          key={mood.value}
          onClick={() => onChange(value === mood.value ? null : mood.value)}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all',
            'hover:bg-black/5 dark:hover:bg-white/10',
            value === mood.value
              ? 'bg-accent/15 ring-1 ring-accent/30 scale-110'
              : 'bg-transparent'
          )}
          title={mood.label}
          aria-label={mood.label}
        >
          {mood.emoji}
        </button>
      ))}
    </div>
  )
}