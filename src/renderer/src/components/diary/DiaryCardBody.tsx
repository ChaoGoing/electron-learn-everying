/**
 * 卡片正文：按类型渲染。
 *
 * 同一份组件服务两种模式——`read`（卡片板 / 阅读页，纯展示）与
 * `edit`（编排模式，字段就地可改）。这样设计稿的版式只有一处实现，
 * 不会出现"看的时候和编的时候长得不一样"。
 */
import { Check, MapPin, Music2, Plus, Trash2, X } from 'lucide-react'
import { MOOD_EMOJIS, MOOD_LABELS, WEATHER_LABELS, cardWordCount } from '../../lib/diaryCards'
import { CARD_TYPE_ICONS, WEATHER_ICONS } from '../../lib/diaryMeta'
import {
  AutoTextarea,
  Chip,
  JOURNAL_INPUT,
  JournalIconButton,
  ProgressBar
} from './JournalPrimitives'
import type { DiaryCard, DiaryChecklistItem, DiaryPhotoCard } from '../../../../shared/types/diary'

/** 乐观的类型化局部更新；卡片是判别联合，这里收口唯一一处断言。 */
export type CardPatch = (patch: Record<string, unknown>) => void

export interface CardBodyProps {
  card: DiaryCard
  mode?: 'read' | 'edit'
  patch?: CardPatch
}

/* ── 文字 ───────────────────────────────────────────────────── */

function TextCardBody({ card, mode, patch }: CardBodyProps & { card: DiaryCard }): JSX.Element {
  if (card.type !== 'text') return <></>

  if (mode === 'edit') {
    return (
      <>
        <AutoTextarea
          value={card.text}
          onChange={(text): void => patch?.({ text })}
          placeholder="写点什么…"
          className="journal-prose"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-paper-line-soft pt-3">
          <select
            value={card.mood ?? ''}
            onChange={(event): void => patch?.({ mood: event.target.value || null })}
            className={`${JOURNAL_INPUT} h-8 w-auto`}
          >
            <option value="">不标心情</option>
            {Object.entries(MOOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {MOOD_EMOJIS[value]} {label}
              </option>
            ))}
          </select>
          <input
            value={card.tags.join(' / ')}
            onChange={(event): void =>
              patch?.({
                tags: event.target.value
                  .split('/')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              })
            }
            placeholder="标签，用 / 分隔"
            className={`${JOURNAL_INPUT} h-8 flex-1`}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <p className="journal-prose">{card.text || '（空白）'}</p>
      {(card.mood || card.tags.length > 0 || cardWordCount(card) > 0) && (
        <div className="mt-auto flex flex-wrap items-center gap-x-[13px] gap-y-1 border-t border-dashed border-paper-line-soft pt-[13px] text-[11.5px] text-ink-soft">
          {card.mood ? (
            <Chip tone="terra" size="sm">
              {MOOD_EMOJIS[card.mood]} {MOOD_LABELS[card.mood] ?? card.mood}
            </Chip>
          ) : null}
          <span>{cardWordCount(card)} 字</span>
          {card.tags.length > 0 && (
            <>
              <span className="text-paper-line-dash">|</span>
              <span>{card.tags.join(' / ')}</span>
            </>
          )}
        </div>
      )}
    </>
  )
}

/* ── 照片 ───────────────────────────────────────────────────── */

function PhotoCardBody({
  card,
  mode,
  patch
}: CardBodyProps & { card: DiaryPhotoCard }): JSX.Element {
  const addImages = async (): Promise<void> => {
    const urls = await window.api.diary.uploadImages()
    if (urls.length > 0) patch?.({ images: [...card.images, ...urls] })
  }

  const removeImage = (url: string): void => {
    patch?.({ images: card.images.filter((image) => image !== url) })
  }

  if (mode === 'edit') {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          {card.images.map((url) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt={card.caption || '日记照片'}
                className="h-[104px] w-full rounded-[11px] object-cover"
              />
              <JournalIconButton
                tone="bare"
                size={24}
                aria-label="移除这张照片"
                onClick={(): void => removeImage(url)}
                className="absolute right-1.5 top-1.5 bg-paper-card/90 text-clay"
              >
                <X size={13} />
              </JournalIconButton>
            </div>
          ))}
          <button
            type="button"
            onClick={(): void => void addImages()}
            className="flex h-[104px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-paper-line-dash text-[12px] text-ink hover:bg-paper-sunken"
          >
            <Plus size={16} />
            添加照片
          </button>
        </div>
        <input
          value={card.caption}
          onChange={(event): void => patch?.({ caption: event.target.value })}
          placeholder="配一句话"
          className={`${JOURNAL_INPUT} mt-3`}
        />
        <input
          value={card.place ?? ''}
          onChange={(event): void => patch?.({ place: event.target.value || null })}
          placeholder="拍摄地点"
          className={`${JOURNAL_INPUT} mt-2`}
        />
      </>
    )
  }

  const [first, ...rest] = card.images

  return (
    <>
      {first ? (
        <img
          src={first}
          alt={card.caption || '日记照片'}
          className="block w-full rounded-[11px] object-cover"
          style={{ height: card.width === 'full' ? 200 : 150 }}
        />
      ) : (
        <div className="flex h-[150px] items-center justify-center rounded-[11px] border border-dashed border-paper-line-dash text-[12px] text-ink-soft">
          还没有照片
        </div>
      )}
      {rest.length > 0 ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {rest.map((url) => (
            <img
              key={url}
              src={url}
              alt="日记照片"
              className="h-[56px] w-full rounded-[9px] object-cover"
            />
          ))}
        </div>
      ) : null}
      {(card.caption || card.place) && (
        <div className="mt-auto flex flex-wrap items-baseline gap-x-[14px] gap-y-1 pt-3">
          {card.caption ? (
            <p className="m-0 font-serif text-[13.5px] leading-[1.75] text-ink-strong">
              {card.caption}
            </p>
          ) : null}
          {card.place ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
              <MapPin size={12} />
              {card.place}
            </span>
          ) : null}
        </div>
      )}
    </>
  )
}

/* ── 摘录 ───────────────────────────────────────────────────── */

function QuoteCardBody({ card, mode, patch }: CardBodyProps & { card: DiaryCard }): JSX.Element {
  if (card.type !== 'quote') return <></>

  if (mode === 'edit') {
    return (
      <>
        <AutoTextarea
          value={card.text}
          onChange={(text): void => patch?.({ text })}
          placeholder="摘录的句子"
          minRows={2}
          className="font-serif text-[15px] leading-[1.85]"
        />
        <input
          value={card.source}
          onChange={(event): void => patch?.({ source: event.target.value })}
          placeholder="出处"
          className={`${JOURNAL_INPUT} mt-3`}
        />
      </>
    )
  }

  return (
    <blockquote className="m-0 flex gap-2.5">
      <span
        aria-hidden="true"
        className="shrink-0 font-display text-[40px] leading-[0.72] text-terra"
      >
        &ldquo;
      </span>
      <div className="min-w-0">
        <p className="m-0 font-serif text-[15px] leading-[1.85] text-ink-strong">{card.text}</p>
        {card.source ? <div className="mt-2 text-[11.5px] text-ink-soft">{card.source}</div> : null}
      </div>
    </blockquote>
  )
}

/* ── 清单 ───────────────────────────────────────────────────── */

function CheckBox({ checked, onToggle }: { checked: boolean; onToggle?: () => void }): JSX.Element {
  const interactive = Boolean(onToggle)
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!interactive}
      aria-pressed={checked}
      className={[
        'inline-flex size-[18px] shrink-0 items-center justify-center rounded-[6px]',
        checked ? 'bg-moss text-moss-soft' : 'border-[1.5px] border-paper-line-dash bg-paper-card',
        interactive ? 'cursor-pointer' : 'cursor-default'
      ].join(' ')}
    >
      {checked ? <Check size={12} strokeWidth={2.5} /> : null}
    </button>
  )
}

function ChecklistCardBody({
  card,
  mode,
  patch
}: CardBodyProps & { card: DiaryCard }): JSX.Element {
  if (card.type !== 'checklist') return <></>

  const done = card.items.filter((item) => item.done).length

  const updateItems = (items: DiaryChecklistItem[]): void => patch?.({ items })

  const toggle = (id: string): void =>
    updateItems(card.items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))

  if (mode === 'edit') {
    return (
      <div className="flex flex-col gap-2.5">
        {card.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5">
            <CheckBox checked={item.done} onToggle={(): void => toggle(item.id)} />
            <input
              value={item.text}
              onChange={(event): void =>
                updateItems(
                  card.items.map((current) =>
                    current.id === item.id ? { ...current, text: event.target.value } : current
                  )
                )
              }
              placeholder="待办事项"
              className="min-w-0 flex-1 border-b border-transparent bg-transparent text-[13px] text-ink-strong outline-none placeholder:text-ink-faint focus:border-paper-line-dash"
            />
            <JournalIconButton
              tone="bare"
              size={24}
              aria-label="删除这一项"
              onClick={(): void => updateItems(card.items.filter((c) => c.id !== item.id))}
            >
              <Trash2 size={13} />
            </JournalIconButton>
          </div>
        ))}
        <button
          type="button"
          onClick={(): void =>
            updateItems([
              ...card.items,
              { id: globalThis.crypto.randomUUID(), text: '', done: false }
            ])
          }
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] border border-dashed border-paper-line-dash px-2.5 text-[12px] text-ink hover:bg-paper-sunken"
        >
          <Plus size={13} />
          添加一项
        </button>
      </div>
    )
  }

  if (card.variant === 'pills') {
    return (
      <div className="flex flex-wrap gap-2">
        {card.items.map((item) => (
          <Chip key={item.id} tone={item.done ? 'moss' : 'line'}>
            {item.done ? <Check size={11} strokeWidth={2.5} /> : null}
            {item.text}
          </Chip>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {card.items.map((item) => (
        <div key={item.id} className="flex items-center gap-2.5">
          <CheckBox
            checked={item.done}
            onToggle={patch ? (): void => toggle(item.id) : undefined}
          />
          <span
            className={
              item.done
                ? 'text-[13.5px] text-ink-soft line-through'
                : 'text-[13.5px] text-ink-strong'
            }
          >
            {item.text}
          </span>
        </div>
      ))}
      {card.items.length > 0 ? (
        <div className="mt-auto pt-[13px]">
          <ProgressBar value={done / card.items.length} className="h-1.5" barClassName="bg-moss" />
        </div>
      ) : null}
    </div>
  )
}

/* ── 心情 / 音乐 / 天气 / 位置 ──────────────────────────────── */

function MoodCardBody({ card, mode, patch }: CardBodyProps & { card: DiaryCard }): JSX.Element {
  if (card.type !== 'mood') return <></>

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(MOOD_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={mode !== 'edit'}
            onClick={(): void => patch?.({ mood: card.mood === value ? null : value })}
            className={
              card.mood === value
                ? 'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-terra-tint px-2.5 text-[12.5px] text-terra-tint-ink'
                : 'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-ink'
            }
          >
            <span>{MOOD_EMOJIS[value]}</span>
            {label}
          </button>
        ))}
      </div>
      {mode === 'edit' ? (
        <AutoTextarea
          value={card.note}
          onChange={(note): void => patch?.({ note })}
          placeholder="为什么是这个心情"
          minRows={2}
          className="font-serif text-[13.5px] leading-[1.8]"
        />
      ) : card.note ? (
        <p className="m-0 font-serif text-[13.5px] leading-[1.8] text-ink">{card.note}</p>
      ) : null}
    </div>
  )
}

function MusicCardBody({ card, mode, patch }: CardBodyProps & { card: DiaryCard }): JSX.Element {
  if (card.type !== 'music') return <></>

  if (mode === 'edit') {
    return (
      <div className="flex flex-col gap-2">
        <input
          value={card.song}
          onChange={(event): void => patch?.({ song: event.target.value })}
          placeholder="歌名"
          className={JOURNAL_INPUT}
        />
        <input
          value={card.artist}
          onChange={(event): void => patch?.({ artist: event.target.value })}
          placeholder="歌手"
          className={JOURNAL_INPUT}
        />
        <input
          value={card.url ?? ''}
          onChange={(event): void => patch?.({ url: event.target.value || null })}
          placeholder="链接（可选）"
          className={JOURNAL_INPUT}
        />
        <AutoTextarea
          value={card.note}
          onChange={(note): void => patch?.({ note })}
          placeholder="听的时候在想什么"
          minRows={2}
          className="font-serif text-[13.5px] leading-[1.8]"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-paper-sunken text-ink">
          <Music2 size={16} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] text-ink-strong">{card.song || '未填写'}</div>
          {card.artist ? <div className="text-[11.5px] text-ink-soft">{card.artist}</div> : null}
        </div>
      </div>
      {card.note ? (
        <p className="m-0 font-serif text-[13.5px] leading-[1.8] text-ink">{card.note}</p>
      ) : null}
    </div>
  )
}

function WeatherCardBody({ card, mode, patch }: CardBodyProps & { card: DiaryCard }): JSX.Element {
  if (card.type !== 'weather') return <></>
  const Icon = card.weather ? WEATHER_ICONS[card.weather] : null

  if (mode === 'edit') {
    return (
      <div className="flex flex-wrap gap-2">
        <select
          value={card.weather ?? ''}
          onChange={(event): void => patch?.({ weather: event.target.value || null })}
          className={`${JOURNAL_INPUT} h-8 w-auto`}
        >
          <option value="">不记天气</option>
          {Object.entries(WEATHER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={card.temperature ?? ''}
          onChange={(event): void =>
            patch?.({ temperature: event.target.value === '' ? null : Number(event.target.value) })
          }
          placeholder="温度"
          className={`${JOURNAL_INPUT} h-8 w-24`}
        />
        <input
          value={card.place ?? ''}
          onChange={(event): void => patch?.({ place: event.target.value || null })}
          placeholder="地点"
          className={`${JOURNAL_INPUT} h-8 flex-1`}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {Icon ? <Icon size={26} className="text-terra-tint-ink" /> : null}
      <div className="text-[15px] text-ink-strong">
        {card.weather ? WEATHER_LABELS[card.weather] : '未记录'}
        {card.temperature !== null ? ` ${card.temperature}°` : ''}
      </div>
      {card.place ? (
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
          <MapPin size={12} />
          {card.place}
        </span>
      ) : null}
    </div>
  )
}

function LocationCardBody({ card, mode, patch }: CardBodyProps & { card: DiaryCard }): JSX.Element {
  if (card.type !== 'location') return <></>

  if (mode === 'edit') {
    return (
      <div className="flex flex-col gap-2">
        <input
          value={card.place}
          onChange={(event): void => patch?.({ place: event.target.value })}
          placeholder="地点"
          className={JOURNAL_INPUT}
        />
        <AutoTextarea
          value={card.note}
          onChange={(note): void => patch?.({ note })}
          placeholder="在这儿发生了什么"
          minRows={2}
          className="font-serif text-[13.5px] leading-[1.8]"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[15px] text-ink-strong">
        <MapPin size={16} className="text-terra" />
        {card.place || '未填写地点'}
      </div>
      {card.note ? (
        <p className="m-0 font-serif text-[13.5px] leading-[1.8] text-ink">{card.note}</p>
      ) : null}
    </div>
  )
}

/** 按类型分派正文。 */
export function DiaryCardBody(props: CardBodyProps): JSX.Element {
  switch (props.card.type) {
    case 'text':
      return <TextCardBody {...props} card={props.card} />
    case 'photo':
      return <PhotoCardBody {...props} card={props.card} />
    case 'quote':
      return <QuoteCardBody {...props} card={props.card} />
    case 'checklist':
      return <ChecklistCardBody {...props} card={props.card} />
    case 'mood':
      return <MoodCardBody {...props} card={props.card} />
    case 'music':
      return <MusicCardBody {...props} card={props.card} />
    case 'weather':
      return <WeatherCardBody {...props} card={props.card} />
    case 'location':
      return <LocationCardBody {...props} card={props.card} />
  }
}

/** 卡片类型对应的头部图标。 */
export function CardTypeIconOf({
  type,
  size = 13
}: {
  type: DiaryCard['type']
  size?: number
}): JSX.Element {
  const Icon = CARD_TYPE_ICONS[type]
  return <Icon size={size} className="shrink-0" />
}
