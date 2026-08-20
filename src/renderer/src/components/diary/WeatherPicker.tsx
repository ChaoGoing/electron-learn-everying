import { Cloud, CloudRain, CloudSnow, Sun, Wind, CloudLightning, CloudFog } from 'lucide-react'
import { cn } from '../../lib/cn'

const WEATHERS = [
  { value: 'sunny', icon: Sun, label: '晴' },
  { value: 'cloudy', icon: Cloud, label: '多云' },
  { value: 'rainy', icon: CloudRain, label: '雨' },
  { value: 'snowy', icon: CloudSnow, label: '雪' },
  { value: 'windy', icon: Wind, label: '风' },
  { value: 'stormy', icon: CloudLightning, label: '雷暴' },
  { value: 'foggy', icon: CloudFog, label: '雾' },
]

interface WeatherPickerProps {
  value: string | null
  onChange: (weather: string | null) => void
}

export function WeatherPicker({ value, onChange }: WeatherPickerProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      {WEATHERS.map((w) => (
        <button
          key={w.value}
          onClick={() => onChange(value === w.value ? null : w.value)}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-lg transition-all',
            'hover:bg-black/5 dark:hover:bg-white/10',
            value === w.value
              ? 'bg-accent/15 ring-1 ring-accent/30 text-accent'
              : 'text-text-secondary-light dark:text-text-secondary-dark'
          )}
          title={w.label}
          aria-label={w.label}
        >
          <w.icon size={18} />
        </button>
      ))}
    </div>
  )
}