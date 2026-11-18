/**
 * 卡片 / 条目用到的图标映射。
 *
 * 设计稿用的是内联线性 SVG；这里统一用项目已有的 lucide-react（AGENTS.md 约定），
 * 语义与线宽都对得上，省掉几十段手抄的 path。
 */
import {
  AlignLeft,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Image,
  ListChecks,
  MapPin,
  Music2,
  Quote,
  Smile,
  Sun,
  Wind,
  type LucideIcon
} from 'lucide-react'
import type { DiaryCardType } from '../../../shared/types/diary'

/** 卡片类型 → 头部图标（设计稿「卡片属性」里的六个 + 天气 / 位置）。 */
export const CARD_TYPE_ICONS: Record<DiaryCardType, LucideIcon> = {
  text: AlignLeft,
  photo: Image,
  quote: Quote,
  checklist: ListChecks,
  mood: Smile,
  music: Music2,
  weather: CloudSun,
  location: MapPin
}

export const WEATHER_ICONS: Record<string, LucideIcon> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
  stormy: CloudLightning,
  foggy: CloudFog
}
