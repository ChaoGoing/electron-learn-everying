/**
 * 编排模式：设计稿 `Editor.dc.html`。
 *
 * 左侧三块面板（页面结构 / 卡片属性 / 素材），右侧是卡片板本体：
 * 卡片可拖动重排、可选中改属性，选中后头部有上移/下移/复制/删除。
 *
 * 所有改动都立即落盘（走 `window.api.diary.update`），撤销/重做在本地维护
 * 一个 cards 快照栈——不引入额外的状态库。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Copy,
  Download,
  Eye,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  MapPin,
  Plus,
  Redo2,
  Trash2,
  Type,
  Undo2,
  CloudSun,
  Music2,
  Smile
} from 'lucide-react'
import { DiaryCardView } from '../../components/diary/DiaryCardView'
import { TemplatesPanel } from '../../components/diary/InsightPanels'
import { JournalToolbar } from '../../components/diary/JournalToolbar'
import { JournalWorkspace } from '../../components/diary/JournalWorkspace'
import {
  JOURNAL_INPUT,
  JournalButton,
  JournalIconButton,
  Panel,
  SECTION_LABEL
} from '../../components/diary/JournalPrimitives'
import { useDiaryStore } from '../../stores/diaryStore'
import {
  applyTemplate,
  createCard,
  DEFAULT_CARD_TITLES,
  dropSideOf,
  dropSideOfVertical,
  insertCardAt,
  insertIndexFor,
  moveCardTo,
  type DropSide
} from '../../lib/diaryCards'
import { fromDateKey } from '../../lib/diaryStats'
import {
  CARD_BACKGROUND_LABELS,
  CARD_TYPE_LABELS,
  CARD_WIDTH_LABELS,
  PAGE_BACKGROUND_HEX,
  PAGE_BACKGROUND_LABELS,
  type DiaryCard,
  type DiaryCardBackground,
  type DiaryCardType,
  type DiaryCardWidth,
  type DiaryEntry,
  type UpdateDiaryEntry,
  type DiaryPageBackground
} from '../../../../shared/types/diary'

const TYPE_ORDER: DiaryCardType[] = [
  'text',
  'photo',
  'quote',
  'checklist',
  'mood',
  'music',
  'weather',
  'location'
]

const TYPE_ICONS: Record<DiaryCardType, typeof Type> = {
  text: Type,
  photo: ImageIcon,
  quote: BookOpen,
  checklist: LayoutGrid,
  mood: Smile,
  music: Music2,
  weather: CloudSun,
  location: MapPin
}

const CARD_BACKGROUND_HEX: Record<DiaryCardBackground, string> = {
  paper: '#FFFCF6',
  cream: '#F8F2E3',
  sand: '#F2EADA',
  moss: '#E9EDE4',
  sky: '#E8EAEF'
}

type DragState = { kind: 'card'; cardId: string } | { kind: 'new'; cardType: DiaryCardType } | null

interface DropTarget {
  cardId: string
  side: DropSide
}

export default function DiaryComposePage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const entries = useDiaryStore((state) => state.entries)
  const images = useDiaryStore((state) => state.images)
  const upsertEntry = useDiaryStore((state) => state.upsertEntry)
  const ensureLoaded = useDiaryStore((state) => state.ensureLoaded)

  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  // cards 的历史栈：撤销/重做用。只在本地存，落盘仍以主进程返回为准。
  const historyRef = useRef<DiaryCard[][]>([])
  const cursorRef = useRef(-1)
  const [historyVersion, setHistoryVersion] = useState(0)

  const entry = useMemo(() => entries.find((item) => item.id === id) ?? null, [entries, id])
  const entryId = entry?.id ?? null

  /**
   * 正在编辑的卡片草稿——**编排模式下它就是事实源**。
   *
   * 不能直接渲染 store 里的 `entry.cards`：改一个字要走
   * `update → 落盘 → upsertEntry` 一整圈，输入框的 `value` 慢一拍，
   * React 就会把这个慢一拍的值写回 DOM。中文输入法正在拼的字禁不起这一下——
   * 拼音刚敲进去就被抹掉，字永远出不来（英文每个字母都能等到这一圈，所以看起来是好的）。
   *
   * 草稿同步更新，写盘只是跟在后面的事。
   */
  const [draft, setDraft] = useState<DiaryCard[] | null>(null)

  const cards = useMemo(() => draft ?? entry?.cards ?? [], [draft, entry])

  // 直接打开或刷新 `/diary/:id/edit` 时 store 还是空的，补一次装载。
  useEffect(() => {
    void ensureLoaded()
  }, [ensureLoaded])

  // 换一条日记时丢掉草稿与历史栈。
  useEffect(() => {
    setDraft(null)
    historyRef.current = []
    cursorRef.current = -1
  }, [id])

  // 首次拿到条目时把初始状态压进历史栈。
  useEffect(() => {
    if (!entry) return
    if (cursorRef.current === -1) {
      historyRef.current = [entry.cards]
      cursorRef.current = 0
      setHistoryVersion((version) => version + 1)
    }
  }, [entry])

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedId) ?? null,
    [cards, selectedId]
  )

  const canUndo = cursorRef.current > 0
  const canRedo = cursorRef.current < historyRef.current.length - 1
  void historyVersion

  /* ── 落盘 ─────────────────────────────────────────────────── */

  /**
   * 写盘队列：所有写入排成一条链，保证最后落到磁盘的就是最后改的那一版。
   * 并发发两次 update 时，主进程侧两次写会交错，文件会多出上一版的尾巴
   * （主进程另外也做了串行化，这里先把顺序理顺，省得白白排队）。
   */
  const writeChain = useRef<Promise<void>>(Promise.resolve())

  const enqueueWrite = useCallback(
    (patch: UpdateDiaryEntry): void => {
      if (!entryId) return
      writeChain.current = writeChain.current.then(async (): Promise<void> => {
        try {
          const saved = await window.api.diary.update(entryId, patch)
          if (saved) upsertEntry(saved)
        } catch (error) {
          console.error('保存日记失败：', error)
        }
      })
    },
    [entryId, upsertEntry]
  )

  const commit = useCallback(
    (nextCards: DiaryCard[], options?: { record?: boolean; patch?: Partial<DiaryEntry> }): void => {
      if (!entryId) return
      // 先改本地草稿：输入框这一帧就跟上，不等 IPC 回程。
      setDraft(nextCards)
      if (options?.record ?? true) {
        historyRef.current = [...historyRef.current.slice(0, cursorRef.current + 1), nextCards]
        cursorRef.current = historyRef.current.length - 1
        setHistoryVersion((version) => version + 1)
      }
      enqueueWrite({ cards: nextCards, ...options?.patch })
    },
    [entryId, enqueueWrite]
  )

  const patchSelected = useCallback(
    (patch: Record<string, unknown>): void => {
      if (!selectedId) return
      commit(
        cards.map((card) => (card.id === selectedId ? ({ ...card, ...patch } as DiaryCard) : card))
      )
    },
    [cards, commit, selectedId]
  )

  /**
   * 卡片正文的就地编辑。
   *
   * 不能只给"选中的那张"发 patch：没选中的卡片输入框照样能聚焦（用 Tab 跳进去、
   * 或者点进来但没落到卡片上），这时 onChange 无处可去，React 会把刚敲的字按旧值写回去。
   * 每张卡片都拿到写自己的那个函数，选不选中都能打字。
   */
  const patchCard = useCallback(
    (cardId: string, patch: Record<string, unknown>): void => {
      commit(
        cards.map((card) => (card.id === cardId ? ({ ...card, ...patch } as DiaryCard) : card))
      )
    },
    [cards, commit]
  )

  const moveCard = useCallback(
    (cardId: string, delta: number): void => {
      const from = cards.findIndex((card) => card.id === cardId)
      if (from === -1) return
      const insertBefore = delta < 0 ? from - 1 : from + 2
      if (insertBefore < 0 || insertBefore > cards.length) return
      commit(moveCardTo(cards, from, insertBefore))
    },
    [cards, commit]
  )

  const duplicateCard = useCallback(
    (cardId: string): void => {
      const index = cards.findIndex((card) => card.id === cardId)
      if (index === -1) return
      const clone: DiaryCard = { ...cards[index], id: globalThis.crypto.randomUUID() }
      commit(insertCardAt(cards, clone, index + 1))
      setSelectedId(clone.id)
    },
    [cards, commit]
  )

  const removeCard = useCallback(
    (cardId: string): void => {
      if (!window.confirm('删除这张卡片？删除后这张卡片的内容就不在了。')) return
      commit(
        cards
          .filter((card) => card.id !== cardId)
          .map((card, position) => ({ ...card, order: position }))
      )
      if (selectedId === cardId) setSelectedId(null)
    },
    [cards, commit, selectedId]
  )

  const addCard = useCallback(
    (type: DiaryCardType, insertBefore?: number): void => {
      const at = insertBefore ?? cards.length
      const card = createCard(type, at)
      commit(insertCardAt(cards, card, at))
      setSelectedId(card.id)
    },
    [cards, commit]
  )

  const changeCardType = useCallback(
    (type: DiaryCardType): void => {
      if (!selectedCard || selectedCard.type === type) return
      const rebuilt = createCard(type, selectedCard.order)
      // 保留版式相关的设置，让"换个类型"不重置用户已经调好的外观。
      // 标题只在用户自己改过（不等于原类型默认名）时才沿用，否则换成新类型的默认名——
      // 否则「随笔」这种默认名会跟着卡片跑到「天气」上。
      const renamedByUser =
        selectedCard.title.length > 0 &&
        selectedCard.title !== DEFAULT_CARD_TITLES[selectedCard.type]
      const replaced: DiaryCard = {
        ...rebuilt,
        id: selectedCard.id,
        padding: selectedCard.padding,
        background: selectedCard.background,
        width: selectedCard.width,
        time: selectedCard.time,
        title: renamedByUser ? selectedCard.title : rebuilt.title
      }
      commit(cards.map((card) => (card.id === selectedCard.id ? replaced : card)))
    },
    [cards, commit, selectedCard]
  )

  const undo = useCallback((): void => {
    if (cursorRef.current <= 0) return
    cursorRef.current -= 1
    setHistoryVersion((version) => version + 1)
    commit(historyRef.current[cursorRef.current], { record: false })
  }, [commit])

  const redo = useCallback((): void => {
    if (cursorRef.current >= historyRef.current.length - 1) return
    cursorRef.current += 1
    setHistoryVersion((version) => version + 1)
    commit(historyRef.current[cursorRef.current], { record: false })
  }, [commit])

  const draggedCardId = drag?.kind === 'card' ? drag.cardId : null
  const draggedIndex = useMemo(
    () => (draggedCardId ? cards.findIndex((card) => card.id === draggedCardId) : -1),
    [cards, draggedCardId]
  )
  /** 统一的落点处理：重排，或在落点插入新卡片。 */
  const dropOnCard = useCallback(
    (targetId: string, side: DropSide): void => {
      const index = cards.findIndex((card) => card.id === targetId)
      if (index === -1 || !drag) return
      const insertBefore = insertIndexFor(index, side)
      if (drag.kind === 'new') {
        addCard(drag.cardType, insertBefore)
      } else if (draggedIndex !== -1) {
        const next = moveCardTo(cards, draggedIndex, insertBefore)
        if (next.some((card, position) => card.id !== cards[position]?.id)) commit(next)
      }
      setDrag(null)
      setDropTarget(null)
    },
    [addCard, cards, commit, drag, draggedIndex]
  )

  const changeDate = useCallback(
    (date: string): void => {
      if (!date) return
      enqueueWrite({ date })
    },
    [enqueueWrite]
  )

  const changeBackground = useCallback(
    (background: DiaryPageBackground): void => {
      enqueueWrite({ background })
    },
    [enqueueWrite]
  )

  useEffect(() => {
    if (!entry && !id) setError('找不到这条日记')
  }, [entry, id])

  if (!entry) {
    return (
      <>
        <JournalToolbar view="entry" />
        <div className="flex flex-1 items-center justify-center text-sm text-ink">
          {error ?? '加载中…'}
        </div>
      </>
    )
  }

  const dateStr = entry.createdAt.slice(0, 10)
  const dateLabel = `${fromDateKey(dateStr).getMonth() + 1}月${fromDateKey(dateStr).getDate()}日`

  return (
    <>
      <JournalToolbar
        view="entry"
        actions={
          <>
            <div className="inline-flex items-center gap-[3px] rounded-xl border border-paper-line bg-paper-sunken p-[3px]">
              <button
                type="button"
                onClick={(): void => {
                  navigate(`/diary/${entry.id}`)
                }}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] px-[15px] text-[13px] text-ink"
              >
                <BookOpen size={14} />
                阅读
              </button>
              <span
                aria-current="page"
                className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-paper-card px-[15px] text-[13px] font-medium text-ink-strong shadow-card"
              >
                <LayoutGrid size={14} />
                编排
              </span>
            </div>

            <JournalIconButton aria-label="撤销" onClick={undo} disabled={!canUndo}>
              <Undo2 size={16} />
            </JournalIconButton>
            <JournalIconButton aria-label="重做" onClick={redo} disabled={!canRedo}>
              <Redo2 size={16} />
            </JournalIconButton>

            <JournalButton
              onClick={(): void => {
                navigate(`/diary/${entry.id}`)
              }}
            >
              <Eye size={14} />
              预览
            </JournalButton>
            <JournalButton
              tone="primary"
              onClick={(): void => {
                navigate(`/diary/${entry.id}`)
              }}
            >
              <Download size={14} />
              完成编排
            </JournalButton>
          </>
        }
      />

      <JournalWorkspace
        railWidth={320}
        mainClassName={showGrid ? 'journal-grid-8px' : undefined}
        background={PAGE_BACKGROUND_HEX[entry.background]}
        rail={
          <>
            {/* 页面结构 */}
            <Panel tone="warm" className="flex w-full min-w-0 flex-col p-[18px]">
              <div className="mb-3 flex items-baseline gap-2">
                <span className={SECTION_LABEL}>页面结构</span>
                <span className="ml-auto text-[11.5px] text-ink">
                  {dateLabel} · {cards.length} 张卡片
                </span>
              </div>

              {/* 卡片多了以后这个列表会很长，给它自己的滚动区，
                免得把下面的「卡片属性」挤出可视范围。 */}
              <ol className="m-0 flex max-h-[min(38vh,320px)] list-none flex-col gap-0.5 overflow-y-auto p-0">
                {cards.map((card) => {
                  const Icon = TYPE_ICONS[card.type]
                  const isSelected = card.id === selectedId
                  const isDragging = draggedCardId === card.id
                  return (
                    <li key={card.id}>
                      <button
                        type="button"
                        onClick={(): void => setSelectedId(card.id)}
                        draggable
                        onDragStart={(event): void => {
                          event.dataTransfer.setData('text/plain', `diary-card:${card.id}`)
                          event.dataTransfer.effectAllowed = 'move'
                          setDrag({ kind: 'card', cardId: card.id })
                        }}
                        onDragEnd={(): void => setDrag(null)}
                        onDragOver={(event): void => {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = drag?.kind === 'new' ? 'copy' : 'move'
                          setDropTarget({
                            cardId: card.id,
                            side: dropSideOfVertical(event, event.currentTarget)
                          })
                        }}
                        onDrop={(event): void => {
                          event.preventDefault()
                          dropOnCard(card.id, dropSideOfVertical(event, event.currentTarget))
                        }}
                        aria-current={isSelected ? 'true' : undefined}
                        className={[
                          'flex h-[38px] w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[12.5px]',
                          isDragging
                            ? 'border border-dashed border-terra bg-terra-wash text-terra'
                            : isSelected
                              ? 'border border-terra bg-paper-selected font-medium text-ink-strong'
                              : 'text-ink hover:bg-paper-sunken',
                          // 竖向列表的插入条画在行的上/下沿
                          dropTarget?.cardId === card.id && draggedCardId !== card.id
                            ? dropTarget.side === 'before'
                              ? 'shadow-[inset_0_2px_0_0_var(--color-terra)]'
                              : 'shadow-[inset_0_-2px_0_0_var(--color-terra)]'
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <Icon size={13} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {card.title || DEFAULT_CARD_TITLES[card.type]}
                        </span>
                        {isDragging ? (
                          <span className="text-[11px]">移动中</span>
                        ) : (
                          <span className="font-display text-[11.5px]">{card.time ?? ''}</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ol>

              <button
                type="button"
                onClick={(): void => addCard('text')}
                className="mt-2 flex h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-paper-line-dash-strong text-[12.5px] text-ink hover:bg-paper-sunken"
              >
                <Plus size={14} />
                添加卡片
              </button>

              <div className="mt-auto border-t border-dashed border-paper-line-strong pt-3.5">
                <div className={`${SECTION_LABEL} mb-2.5`}>页面设置</div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <label htmlFor="page-date" className="w-[54px] shrink-0 text-xs text-ink">
                      日期
                    </label>
                    <input
                      id="page-date"
                      type="date"
                      value={dateStr}
                      onChange={(event): void => changeDate(event.target.value)}
                      className={JOURNAL_INPUT}
                    />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-[54px] shrink-0 text-xs text-ink">网格</span>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink-strong">
                      <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(event): void => setShowGrid(event.target.checked)}
                        className="m-0 size-4 accent-terra"
                      />
                      显示 8px 网格
                    </label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-[54px] shrink-0 text-xs text-ink">底色</span>
                    <div className="flex gap-[7px]">
                      {(Object.keys(PAGE_BACKGROUND_LABELS) as DiaryPageBackground[]).map(
                        (value) => (
                          <button
                            key={value}
                            type="button"
                            title={PAGE_BACKGROUND_LABELS[value]}
                            aria-label={`页面底色 ${PAGE_BACKGROUND_LABELS[value]}`}
                            onClick={(): void => changeBackground(value)}
                            className="size-[26px] cursor-pointer rounded-[8px]"
                            style={{
                              backgroundColor: PAGE_BACKGROUND_HEX[value],
                              border:
                                entry.background === value
                                  ? '2px solid var(--color-terra)'
                                  : '1px solid var(--color-paper-line-dash-strong)'
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* 卡片属性 */}
            <Panel tone="warm" className="flex w-full min-w-0 flex-col p-[18px]">
              <div className="mb-3 flex items-baseline gap-2">
                <span className={SECTION_LABEL}>卡片属性</span>
                <span className="ml-auto text-[11.5px] text-ink">
                  {selectedCard ? selectedCard.title || '未命名卡片' : '未选中卡片'}
                </span>
              </div>

              {selectedCard ? (
                <>
                  <div className="mb-2 text-[11.5px] text-ink">卡片类型</div>
                  <div className="grid grid-cols-3 gap-[7px]">
                    {TYPE_ORDER.map((type) => {
                      const Icon = TYPE_ICONS[type]
                      const active = selectedCard.type === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={(): void => changeCardType(type)}
                          className={[
                            'flex h-[52px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border bg-paper-card text-[11px]',
                            active
                              ? 'border-terra text-ink-strong'
                              : 'border-paper-line-dash-strong text-ink'
                          ].join(' ')}
                        >
                          <Icon size={15} />
                          {CARD_TYPE_LABELS[type]}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mb-2 mt-3.5 text-[11.5px] text-ink">版式宽度</div>
                  <div className="grid grid-cols-3 gap-[7px]">
                    {(['full', 'half', 'third'] as DiaryCardWidth[]).map((width) => (
                      <button
                        key={width}
                        type="button"
                        onClick={(): void => patchSelected({ width })}
                        className={[
                          'flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border text-xs',
                          selectedCard.width === width
                            ? 'border-terra bg-paper-selected font-medium text-ink-strong'
                            : 'border-paper-line-dash-strong bg-paper-card text-ink'
                        ].join(' ')}
                      >
                        {CARD_WIDTH_LABELS[width]}
                      </button>
                    ))}
                  </div>

                  {selectedCard.type === 'checklist' ? (
                    <>
                      <div className="mb-2 mt-3.5 text-[11.5px] text-ink">清单样式</div>
                      <div className="grid grid-cols-2 gap-[7px]">
                        {(
                          [
                            ['list', '勾选清单'],
                            ['pills', '打卡胶囊']
                          ] as Array<['list' | 'pills', string]>
                        ).map(([variant, label]) => (
                          <button
                            key={variant}
                            type="button"
                            onClick={(): void => patchSelected({ variant })}
                            className={[
                              'flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border text-xs',
                              selectedCard.type === 'checklist' && selectedCard.variant === variant
                                ? 'border-terra bg-paper-selected font-medium text-ink-strong'
                                : 'border-paper-line-dash-strong bg-paper-card text-ink'
                            ].join(' ')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <div className="mb-2 mt-3.5 flex items-baseline gap-2">
                    <label htmlFor="card-padding" className="text-[11.5px] text-ink">
                      卡片内边距
                    </label>
                    <span className="ml-auto font-display text-[12.5px] text-ink-strong">
                      {selectedCard.padding} px
                    </span>
                  </div>
                  <input
                    id="card-padding"
                    type="range"
                    min={8}
                    max={32}
                    step={2}
                    value={selectedCard.padding}
                    onChange={(event): void =>
                      patchSelected({ padding: Number(event.target.value) })
                    }
                    className="m-0 h-5 w-full accent-terra"
                  />

                  <div className="mb-2 mt-3 text-[11.5px] text-ink">卡片底色</div>
                  <div className="flex gap-[7px]">
                    {(Object.keys(CARD_BACKGROUND_LABELS) as DiaryCardBackground[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        title={CARD_BACKGROUND_LABELS[value]}
                        aria-label={`底色 ${CARD_BACKGROUND_LABELS[value]}`}
                        onClick={(): void => patchSelected({ background: value })}
                        className="size-[30px] cursor-pointer rounded-[9px]"
                        style={{
                          backgroundColor: CARD_BACKGROUND_HEX[value],
                          border:
                            selectedCard.background === value
                              ? '2px solid var(--color-terra)'
                              : '1px solid var(--color-paper-line-dash-strong)'
                        }}
                      />
                    ))}
                  </div>

                  <div className="mb-2 mt-3 text-[11.5px] text-ink">卡片标题与时刻</div>
                  <div className="flex gap-2">
                    <input
                      value={selectedCard.title}
                      onChange={(event): void => patchSelected({ title: event.target.value })}
                      placeholder="卡片标题"
                      className={`${JOURNAL_INPUT} flex-1`}
                    />
                    <input
                      type="time"
                      value={selectedCard.time ?? ''}
                      onChange={(event): void =>
                        patchSelected({ time: event.target.value || null })
                      }
                      className={`${JOURNAL_INPUT} w-[92px]`}
                    />
                  </div>

                  <div className="mt-auto flex gap-2 pt-4">
                    <JournalButton
                      size="sm"
                      tone="outline"
                      className="flex-1"
                      onClick={(): void => duplicateCard(selectedCard.id)}
                    >
                      <Copy size={13} />
                      复制卡片
                    </JournalButton>
                    <JournalButton
                      size="sm"
                      tone="danger"
                      className="flex-1"
                      onClick={(): void => removeCard(selectedCard.id)}
                    >
                      <Trash2 size={13} />
                      移除这张卡片
                    </JournalButton>
                  </div>
                </>
              ) : (
                <p className="m-0 text-[12.5px] leading-[1.9] text-ink">
                  点一下右边的任意一张卡片，这里就能改它的类型、宽度、内边距和底色。
                </p>
              )}
            </Panel>

            {/* 素材 */}
            <Panel tone="warm" className="flex w-full min-w-0 flex-col p-[18px]">
              <div className="mb-3 flex items-baseline gap-2">
                <span className={SECTION_LABEL}>素材 · 拖到板上</span>
                <span className="ml-auto text-[11px] text-ink">按住拖动</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_ORDER.slice(0, 6).map((type) => {
                  const Icon = TYPE_ICONS[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(event): void => {
                        event.dataTransfer.setData('text/plain', `diary-card:${type}`)
                        event.dataTransfer.effectAllowed = 'copy'
                        setDrag({ kind: 'new', cardType: type })
                      }}
                      onDragEnd={(): void => setDrag(null)}
                      onClick={(): void => addCard(type, cards.length)}
                      className="flex h-[66px] cursor-grab flex-col items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-paper-line-dash-strong bg-paper-card text-[11px] text-ink hover:bg-paper-sunken"
                    >
                      <Icon size={16} />
                      {CARD_TYPE_LABELS[type]}
                    </button>
                  )
                })}
              </div>

              <div className="mt-auto border-t border-dashed border-paper-line-strong pt-3.5">
                <div className={`${SECTION_LABEL} mb-2`}>最近用过的</div>
                {images.length > 0 ? (
                  <div className="flex gap-2">
                    {images.slice(0, 3).map((image) => (
                      <img
                        key={image.url}
                        src={image.url}
                        alt={image.name}
                        className="h-11 w-14 rounded-[9px] border border-paper-line-dash-strong object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="m-0 text-[11.5px] leading-[1.8] text-ink">
                    还没有用过图片。照片卡片里点「添加照片」就会出现在这里。
                  </p>
                )}
              </div>
            </Panel>

            <TemplatesPanel
              targetLabel="这一天"
              disabled={cards.length === 0}
              onApply={(templateId): void => commit(applyTemplate(cards, templateId))}
            />
          </>
        }
      >
        {/* 卡片板 */}
        {cards.map((card) => (
          <DiaryCardView
            key={card.id}
            card={card}
            mode="edit"
            patch={(next): void => patchCard(card.id, next)}
            selected={selectedId === card.id}
            dragging={draggedCardId === card.id}
            dropTarget={dropTarget?.cardId === card.id && draggedCardId !== card.id}
            dropSide={dropTarget?.side}
            headerAside={
              selectedId === card.id ? (
                <span className="ml-1 inline-flex h-5 items-center rounded-full bg-terra px-2 text-[10.5px] tracking-normal text-paper-surface">
                  已选中
                </span>
              ) : null
            }
            actions={
              // 只有选中的那张才铺开操作按钮：一是跟设计稿一致，
              // 二是五个按钮会把窄卡片的标题挤成「晨…」。
              selectedId === card.id ? (
                <>
                  <JournalIconButton
                    tone="bare"
                    size={28}
                    aria-label="上移"
                    className="text-ink"
                    onClick={(): void => moveCard(card.id, -1)}
                  >
                    <ArrowUp size={14} />
                  </JournalIconButton>
                  <JournalIconButton
                    tone="bare"
                    size={28}
                    aria-label="下移"
                    className="text-ink"
                    onClick={(): void => moveCard(card.id, 1)}
                  >
                    <ArrowDown size={14} />
                  </JournalIconButton>
                  <JournalIconButton
                    tone="bare"
                    size={28}
                    aria-label="复制"
                    className="text-ink"
                    onClick={(): void => duplicateCard(card.id)}
                  >
                    <Copy size={14} />
                  </JournalIconButton>
                  <JournalIconButton
                    tone="bare"
                    size={28}
                    aria-label="删除"
                    className="text-clay"
                    onClick={(): void => removeCard(card.id)}
                  >
                    <Trash2 size={14} />
                  </JournalIconButton>
                </>
              ) : null
            }
            footer={
              selectedId === card.id ? (
                <span className="ml-auto">
                  内边距 {card.padding} px · {CARD_WIDTH_LABELS[card.width]}
                </span>
              ) : null
            }
            draggable
            onDragStart={(event): void => {
              event.dataTransfer.setData('text/plain', `diary-card:${card.id}`)
              event.dataTransfer.effectAllowed = 'move'
              setDrag({ kind: 'card', cardId: card.id })
            }}
            onDragEnd={(): void => {
              setDrag(null)
              setDropTarget(null)
            }}
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
            onClick={(): void => setSelectedId(card.id)}
          />
        ))}

        {drag?.kind === 'new' ? (
          <section
            className="flex min-h-[148px] min-w-0 flex-[1_1_300px] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-terra bg-terra-wash"
            onDragOver={(event): void => event.preventDefault()}
            onDrop={(): void => {
              addCard(drag.cardType, cards.length)
              setDrag(null)
              setDropTarget(null)
            }}
          >
            <GripVertical size={18} className="text-terra" />
            <span className="text-[13px] font-medium text-terra">放到这里</span>
            <span className="text-[11.5px] text-ink">{CARD_TYPE_LABELS[drag.cardType]}</span>
          </section>
        ) : null}
      </JournalWorkspace>
    </>
  )
}
