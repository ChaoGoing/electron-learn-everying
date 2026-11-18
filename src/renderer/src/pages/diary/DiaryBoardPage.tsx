/**
 * 卡片板（时间轴）：设计稿 `Main.dc.html` 的内容区。
 *
 * 版面分两栏：
 * - **左栏（固定）**：素材、编排模板、今日提示——都是"工具"，不参与卡片流。
 *   放在卡片流里的话，卡片一多它们就漂到别处，拖拽落卡的交互会一直跳。
 * - **主区（可滚动）**：日期卡 + 当天的卡片 + 月级信息面板（今日小结 / 迷你月历 /
 *   连续记录 / 标签 / 本月心情）。这些是内容与只读信息，跟着内容一起流动。
 *
 * 拖拽用原生 HTML5 DnD：卡片之间拖动即重排（落点由 `dropSideOf` 判定插到前/后），
 * 从「素材」拖进来即在落点插入新卡片。每张卡片悬停浮现 编辑 / 复制 / 删除。
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardActions } from '../../components/diary/CardActions'
import { DiaryCardView } from '../../components/diary/DiaryCardView'
import { DateHeaderCard } from '../../components/diary/DateHeaderCard'
import { JournalToolbar } from '../../components/diary/JournalToolbar'
import { JournalWorkspace } from '../../components/diary/JournalWorkspace'
import {
  MaterialsPanel,
  MiniCalendarPanel,
  MoodPanel,
  PromptPanel,
  StreakPanel,
  TagsPanel,
  TemplatesPanel,
  TodaySummaryPanel
} from '../../components/diary/InsightPanels'
import { useDiaryStore } from '../../stores/diaryStore'
import {
  applyTemplate,
  createCard,
  dropSideOf,
  entryWordCount,
  insertCardAt,
  insertIndexFor,
  moveCardTo,
  type DropSide
} from '../../lib/diaryCards'
import {
  buildDayStats,
  computeStreak,
  monthEntries,
  moodStats,
  pageForDate,
  sortedDateKeys,
  tagStats,
  todayKey
} from '../../lib/diaryStats'
import type { DiaryCard, DiaryCardType } from '../../../../shared/types/diary'

type DragState = { kind: 'card'; cardId: string } | { kind: 'new'; cardType: DiaryCardType } | null

interface DropTarget {
  cardId: string
  side: DropSide
}

export default function DiaryBoardPage(): JSX.Element {
  const navigate = useNavigate()

  const entries = useDiaryStore((state) => state.entries)
  const images = useDiaryStore((state) => state.images)
  const selectedDate = useDiaryStore((state) => state.selectedDate)
  const year = useDiaryStore((state) => state.year)
  const month = useDiaryStore((state) => state.month)
  const selectDate = useDiaryStore((state) => state.selectDate)
  const setMonth = useDiaryStore((state) => state.setMonth)
  const createPage = useDiaryStore((state) => state.createPage)
  const saveCards = useDiaryStore((state) => state.saveCards)
  const deleteCard = useDiaryStore((state) => state.deleteCard)
  const duplicateCard = useDiaryStore((state) => state.duplicateCard)

  const [drag, setDrag] = useState<DragState>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const page = useMemo(() => pageForDate(entries, selectedDate), [entries, selectedDate])
  const cards = useMemo(() => page?.cards ?? [], [page])

  const dayStats = useMemo(() => buildDayStats(entries), [entries])
  const datesWithEntries = useMemo(() => new Set(dayStats.keys()), [dayStats])
  const monthList = useMemo(() => monthEntries(entries, year, month), [entries, year, month])
  const streak = useMemo(() => computeStreak(entries, year, month), [entries, year, month])
  const tags = useMemo(() => tagStats(monthList), [monthList])
  const mood = useMemo(() => moodStats(monthList), [monthList])

  /** 这一天在本月已写下的日子里的序号；没写过则为 null。 */
  const pageIndexInMonth = useMemo(() => {
    const index = sortedDateKeys(monthList).indexOf(selectedDate)
    return index === -1 ? null : index + 1
  }, [monthList, selectedDate])

  const monthWrittenDays = useMemo(() => sortedDateKeys(monthList).length, [monthList])

  const today = todayKey()
  const todayPage = useMemo(() => pageForDate(entries, today), [entries, today])

  const draggedIndex = useMemo(
    () => (drag?.kind === 'card' ? cards.findIndex((card) => card.id === drag.cardId) : -1),
    [cards, drag]
  )

  /* ── 写入 ─────────────────────────────────────────────────── */

  const persistCards = useCallback(
    async (nextCards: DiaryCard[]): Promise<void> => {
      const target = page ?? (await createPage(selectedDate))
      if (!target) return
      await saveCards(target.id, nextCards)
    },
    [page, createPage, selectedDate, saveCards]
  )

  const addCard = useCallback(
    async (type: DiaryCardType, insertBefore: number): Promise<void> => {
      await persistCards(insertCardAt(cards, createCard(type, insertBefore), insertBefore))
    },
    [cards, persistCards]
  )

  /* ── 导航 ─────────────────────────────────────────────────── */

  const openRead = useCallback((): void => {
    if (page) navigate(`/diary/${page.id}`)
  }, [navigate, page])

  const openCompose = useCallback(async (): Promise<void> => {
    const target = page ?? (await createPage(selectedDate))
    if (target) navigate(`/diary/${target.id}/edit`)
  }, [navigate, page, createPage, selectedDate])

  const writeToday = useCallback(async (): Promise<void> => {
    selectDate(today)
    const target = todayPage ?? (await createPage(today))
    if (target) navigate(`/diary/${target.id}/edit`)
  }, [navigate, selectDate, today, todayPage, createPage])

  /* ── 拖拽 ─────────────────────────────────────────────────── */

  const resetDrag = (): void => {
    setDrag(null)
    setDropTarget(null)
  }

  /** 落到某张卡片的一侧：重排，或在那个位置插入新卡片。 */
  const dropOnCard = (targetId: string, side: DropSide): void => {
    const index = cards.findIndex((card) => card.id === targetId)
    if (index === -1 || !drag) {
      resetDrag()
      return
    }
    const insertBefore = insertIndexFor(index, side)
    if (drag.kind === 'new') {
      void addCard(drag.cardType, insertBefore)
    } else if (draggedIndex !== -1) {
      const next = moveCardTo(cards, draggedIndex, insertBefore)
      // 顺序没变就不用写盘
      if (next.some((card, position) => card.id !== cards[position]?.id)) {
        void persistCards(next)
      }
    }
    resetDrag()
  }

  /* ── 左栏 ─────────────────────────────────────────────────── */

  const rail = (
    <>
      <MaterialsPanel
        recentImages={images}
        onAddCard={(type): void => void addCard(type, cards.length)}
        onDragCard={(type): void => setDrag({ kind: 'new', cardType: type })}
      />
      <TemplatesPanel
        disabled={cards.length === 0}
        onApply={(id): void => void persistCards(applyTemplate(cards, id))}
      />
      <PromptPanel onWrite={(): void => void openCompose()} />
    </>
  )

  return (
    <>
      <JournalToolbar view="timeline" onWriteToday={(): void => void writeToday()} />

      <JournalWorkspace rail={rail}>
        <DateHeaderCard
          date={selectedDate}
          page={page}
          pageIndexInMonth={pageIndexInMonth}
          monthWrittenDays={monthWrittenDays}
          onCompose={(): void => void openCompose()}
        />

        {cards.map((card, index) => (
          <DiaryCardView
            key={card.id}
            card={card}
            mode="read"
            draggable
            dragging={draggedIndex === index}
            dropTarget={dropTarget?.cardId === card.id && draggedIndex !== index}
            dropSide={dropTarget?.side}
            actions={
              <CardActions
                revealOnHover
                onEdit={(): void => {
                  void openCompose()
                }}
                onDuplicate={(): void => {
                  if (page) void duplicateCard(page.id, card.id)
                }}
                onDelete={(): void => {
                  if (!page) return
                  if (!window.confirm('删除这张卡片？删除后这张卡片的内容就不在了。')) return
                  void deleteCard(page.id, card.id)
                }}
              />
            }
            onDragStart={(event): void => {
              event.dataTransfer.setData('text/plain', `diary-card:${card.id}`)
              event.dataTransfer.effectAllowed = 'move'
              setDrag({ kind: 'card', cardId: card.id })
            }}
            onDragEnd={resetDrag}
            onDragOver={(event): void => {
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = drag?.kind === 'new' ? 'copy' : 'move'
              setDropTarget({ cardId: card.id, side: dropSideOf(event, event.currentTarget) })
            }}
            onDrop={(event): void => {
              event.preventDefault()
              event.stopPropagation()
              dropOnCard(card.id, dropSideOf(event, event.currentTarget))
            }}
            onClick={openRead}
          />
        ))}

        {/* 卡片流末尾的落点：把卡片拖到空白处即排到最后 */}
        {drag ? (
          <section
            aria-label="拖到末尾"
            onDragOver={(event): void => {
              event.preventDefault()
              event.stopPropagation()
              setDropTarget(null)
            }}
            onDrop={(): void => {
              if (drag.kind === 'new') {
                void addCard(drag.cardType, cards.length)
              } else if (draggedIndex !== -1) {
                void persistCards(moveCardTo(cards, draggedIndex, cards.length))
              }
              resetDrag()
            }}
            className="flex min-h-[120px] min-w-0 flex-[1_1_300px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-terra bg-terra-wash text-[12.5px] text-terra"
          >
            松手放到最后
          </section>
        ) : null}

        {/* 本月口径的面板与当天有没有页面无关，始终显示；只「今日小结」需要页面。 */}
        {page ? <TodaySummaryPanel entry={page} /> : null}
        <MiniCalendarPanel
          year={year}
          month={month}
          selectedDate={selectedDate}
          datesWithEntries={datesWithEntries}
          onSelect={selectDate}
          onMonthChange={setMonth}
        />
        <StreakPanel
          year={year}
          month={month}
          datesWithEntries={datesWithEntries}
          current={streak.current}
          longest={streak.longest}
          unbroken={streak.monthUnbroken}
        />
        <TagsPanel tags={tags} />
        <MoodPanel distribution={mood.distribution} average={mood.average} />
      </JournalWorkspace>

      {page && cards.length > 0 ? (
        <p className="flex-none pb-3 text-center text-[11px] text-ink-soft">
          共 {cards.length} 张卡片 · {entryWordCount(page)} 字 ·
          拖动卡片可重排，悬停卡片可编辑或删除
        </p>
      ) : null}
    </>
  )
}
