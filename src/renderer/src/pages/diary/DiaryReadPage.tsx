/**
 * 阅读模式：设计稿顶栏的「阅读 / 编排」里的阅读一侧。
 *
 * 只读地铺开这一页的卡片，附上日期、心情、天气、地点与字数；不做任何就地编辑。
 */
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookOpen, Heart, LayoutGrid, MapPin, Trash2 } from 'lucide-react'
import { DiaryCardView } from '../../components/diary/DiaryCardView'
import { CardActions } from '../../components/diary/CardActions'
import { JournalToolbar } from '../../components/diary/JournalToolbar'
import { Chip, JournalIconButton, Panel } from '../../components/diary/JournalPrimitives'
import { SyncToolbar } from '../../components/diary/SyncToolbar'
import { useDiaryStore } from '../../stores/diaryStore'
import { MOOD_EMOJIS, MOOD_LABELS, WEATHER_LABELS } from '../../lib/diaryCards'
import { WEATHER_ICONS } from '../../lib/diaryMeta'
import { fromDateKey, weekdayLabel } from '../../lib/diaryStats'
import { PAGE_BACKGROUND_HEX } from '../../../../shared/types/diary'

export default function DiaryReadPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const entries = useDiaryStore((state) => state.entries)
  const upsertEntry = useDiaryStore((state) => state.upsertEntry)
  const deleteCard = useDiaryStore((state) => state.deleteCard)
  const duplicateCard = useDiaryStore((state) => state.duplicateCard)
  const removeEntry = useDiaryStore((state) => state.removeEntry)
  const load = useDiaryStore((state) => state.load)

  const entry = useMemo(() => entries.find((item) => item.id === id) ?? null, [entries, id])

  if (!entry) {
    return (
      <>
        <JournalToolbar view="entry" />
        <div className="flex flex-1 items-center justify-center text-sm text-ink">加载中…</div>
      </>
    )
  }

  const dateStr = entry.createdAt.slice(0, 10)
  const parsed = fromDateKey(dateStr)
  const WeatherIcon = entry.weather ? WEATHER_ICONS[entry.weather] : null

  const toggleFavorite = async (): Promise<void> => {
    const saved = await window.api.diary.update(entry.id, { isFavorite: !entry.isFavorite })
    if (saved) upsertEntry(saved)
  }

  const remove = async (): Promise<void> => {
    if (!window.confirm('确定要删除这一天的日记吗？')) return
    await window.api.diary.delete(entry.id)
    removeEntry(entry.id)
    navigate('/diary')
  }

  return (
    <>
      <JournalToolbar
        view="entry"
        actions={
          <>
            <div className="inline-flex items-center gap-[3px] rounded-xl border border-paper-line bg-paper-sunken p-[3px]">
              <span
                aria-current="page"
                className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-paper-card px-[15px] text-[13px] font-medium text-ink-strong shadow-card"
              >
                <BookOpen size={14} />
                阅读
              </span>
              <button
                type="button"
                onClick={(): void => {
                  navigate(`/diary/${entry.id}/edit`)
                }}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] px-[15px] text-[13px] text-ink"
              >
                <LayoutGrid size={14} />
                编排
              </button>
            </div>
            {/* SyncToolbar 自身是 28px 的紧凑胶囊，待上传角标会溢出到框外，
                这里给它一个带内距的外框，角标就落在框内了。 */}
            <div className="flex items-center rounded-[11px] border border-paper-line-dash-strong bg-paper-card px-1.5 py-1">
              <SyncToolbar onSynced={(): void => void load()} />
            </div>
            <JournalIconButton
              aria-label={entry.isFavorite ? '取消收藏' : '收藏'}
              active={entry.isFavorite}
              onClick={(): void => void toggleFavorite()}
            >
              <Heart size={16} className={entry.isFavorite ? 'fill-terra text-terra' : ''} />
            </JournalIconButton>
            <JournalIconButton aria-label="删除" onClick={(): void => void remove()}>
              <Trash2 size={16} />
            </JournalIconButton>
          </>
        }
      />

      <main
        className="min-h-0 flex-1 overflow-y-auto px-[26px] pb-[30px] pt-[22px]"
        style={{ backgroundColor: PAGE_BACKGROUND_HEX[entry.background] }}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <Panel tone="warm" className="flex flex-col p-[18px]">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-sm tracking-[0.1em] text-ink-soft">
                {parsed.getFullYear()}
              </span>
              <h1 className="m-0 font-display text-[30px] font-semibold leading-none tracking-[0.02em] text-ink-strong">
                {parsed.getMonth() + 1}月{parsed.getDate()}日
              </h1>
              <span className="text-[13px] text-ink">{weekdayLabel(dateStr)}</span>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2">
              {entry.mood ? (
                <Chip tone="terra">
                  {MOOD_EMOJIS[entry.mood]} {MOOD_LABELS[entry.mood] ?? entry.mood}
                </Chip>
              ) : null}
              {WeatherIcon ? (
                <Chip tone="sand">
                  <WeatherIcon size={13} />
                  {entry.weather ? WEATHER_LABELS[entry.weather] : ''}
                </Chip>
              ) : null}
              {entry.location ? (
                <Chip tone="sand">
                  <MapPin size={12} />
                  {entry.location}
                </Chip>
              ) : null}
              {entry.tags.map((tag) => (
                <Chip key={tag} tone="moss">
                  {tag}
                </Chip>
              ))}
              <Chip tone="line">
                {entry.cards.length} 张卡片 · {entry.wordCount} 字
              </Chip>
            </div>
          </Panel>

          <div className="flex flex-wrap items-stretch gap-4">
            {entry.cards.map((card) => (
              <DiaryCardView
                key={card.id}
                card={card}
                mode="read"
                actions={
                  <CardActions
                    revealOnHover
                    onEdit={(): void => {
                      navigate(`/diary/${entry.id}/edit`)
                    }}
                    onDuplicate={(): void => void duplicateCard(entry.id, card.id)}
                    onDelete={(): void => {
                      if (!window.confirm('删除这张卡片？删除后这张卡片的内容就不在了。')) return
                      void deleteCard(entry.id, card.id)
                    }}
                  />
                }
              />
            ))}
          </div>

          {entry.cards.length === 0 ? (
            <Panel className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="m-0 text-sm text-ink">这一天还没有卡片。</p>
              <button
                type="button"
                onClick={(): void => {
                  navigate(`/diary/${entry.id}/edit`)
                }}
                className="cursor-pointer text-sm text-terra hover:text-terra-deep"
              >
                去编排模式加一张
              </button>
            </Panel>
          ) : null}

          <p className="m-0 text-center text-[11.5px] text-ink-soft">
            写于 {entry.createdAt.replace('T', ' ').slice(0, 16)}
            {entry.updatedAt !== entry.createdAt
              ? ` · 更新于 ${entry.updatedAt.replace('T', ' ').slice(0, 16)}`
              : ''}
          </p>
        </div>
      </main>
    </>
  )
}
