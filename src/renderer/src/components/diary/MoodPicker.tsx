import { Button } from '../ui/button'
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
        <Button
          key={mood.value}
          variant="ghost"
          size="icon"
          onClick={() => onChange(value === mood.value ? null : mood.value)}
          className={cn(
            'w-9 h-9 rounded-lg text-lg',
            value === mood.value
              ? 'bg-accent/15 ring-1 ring-accent/30 scale-110'
              : 'bg-transparent'
          )}
          title={mood.label}
          aria-label={mood.label}
        >
          {mood.emoji}
        </Button>
      ))}
    </div>
  )
}
