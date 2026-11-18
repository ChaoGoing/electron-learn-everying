/**
 * 素材库：把散在各篇日记里的照片、摘录、清单收在一起看。
 *
 * 设计稿只给了导航里的「素材库」入口、没有画页面，这里按同一套纸感语言实现：
 * 全部图片（含还没用进日记的）、摘录、清单，外加同步状态。
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Quote as QuoteIcon } from 'lucide-react'
import { JournalToolbar } from '../../components/diary/JournalToolbar'
import { Chip, Panel, PanelHeader } from '../../components/diary/JournalPrimitives'
import { SyncToolbar } from '../../components/diary/SyncToolbar'
import { useDiaryStore } from '../../stores/diaryStore'
import { datedImages, entryDateKey } from '../../lib/diaryStats'

const dateLabel = (date: string): string => date.slice(5).replace('-', '/')

export default function DiaryLibraryPage(): JSX.Element {
  const navigate = useNavigate()

  const entries = useDiaryStore((state) => state.entries)
  const images = useDiaryStore((state) => state.images)
  const load = useDiaryStore((state) => state.load)

  const photos = useMemo(() => datedImages(entries), [entries])

  const usedUrls = useMemo(() => new Set(photos.map((photo) => photo.url)), [photos])
  const unusedImages = useMemo(
    () => images.filter((image) => !usedUrls.has(image.url)),
    [images, usedUrls]
  )

  const quotes = useMemo(
    () =>
      entries.flatMap((entry) =>
        entry.cards
          .filter((card) => card.type === 'quote')
          .map((card) => ({
            id: card.id,
            entryId: entry.id,
            date: entryDateKey(entry),
            text: card.type === 'quote' ? card.text : '',
            source: card.type === 'quote' ? card.source : ''
          }))
      ),
    [entries]
  )

  const checklists = useMemo(
    () =>
      entries.flatMap((entry) =>
        entry.cards
          .filter((card) => card.type === 'checklist')
          .map((card) => ({
            id: card.id,
            entryId: entry.id,
            date: entryDateKey(entry),
            title: card.title,
            items: card.type === 'checklist' ? card.items : []
          }))
      ),
    [entries]
  )

  return (
    <>
      <JournalToolbar view="library" />

      <main className="min-h-0 flex-1 overflow-y-auto px-[26px] pb-[30px] pt-[22px]">
        <div className="flex flex-wrap items-start gap-4">
          <Panel className="flex min-w-0 flex-[2_1_560px] flex-col p-[18px]">
            <PanelHeader
              label="全部图片"
              aside={`${photos.length} 张用进日记${unusedImages.length > 0 ? ` · ${unusedImages.length} 张备用` : ''}`}
            />
            {photos.length + unusedImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2.5">
                {photos.map((photo) => (
                  <button
                    key={`${photo.entryId}-${photo.url}`}
                    type="button"
                    onClick={(): void => {
                      navigate(`/diary/${photo.entryId}`)
                    }}
                    className="group cursor-pointer text-left"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || '日记照片'}
                      className="h-24 w-full rounded-[10px] object-cover"
                    />
                    <span className="mt-1.5 block text-[11.5px] text-ink-soft">
                      {dateLabel(photo.date)}
                      {photo.place ? ` · ${photo.place}` : ''}
                    </span>
                  </button>
                ))}
                {unusedImages.map((image) => (
                  <div key={image.url}>
                    <img
                      src={image.url}
                      alt={image.name}
                      className="h-24 w-full rounded-[10px] object-cover opacity-80"
                    />
                    <span className="mt-1.5 block text-[11.5px] text-ink-soft">还没用过</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 py-8 text-center text-sm text-ink">
                还没有图片。在照片卡片里点「添加照片」就会出现在这里。
              </p>
            )}
          </Panel>

          <Panel className="flex min-w-0 flex-[1_1_360px] flex-col p-[18px]">
            <PanelHeader
              label="摘录"
              aside={`${quotes.length} 条`}
              icon={<QuoteIcon size={13} />}
            />
            <div className="flex flex-col gap-2.5">
              {quotes.slice(0, 8).map((quote) => (
                <button
                  key={quote.id}
                  type="button"
                  onClick={(): void => {
                    navigate(`/diary/${quote.entryId}`)
                  }}
                  className="cursor-pointer rounded-xl border border-paper-line-soft bg-paper-card-alt p-3 text-left hover:bg-paper-sunken"
                >
                  <span className="block font-serif text-[13.5px] leading-[1.8] text-ink-strong">
                    {quote.text}
                  </span>
                  <span className="mt-1.5 block text-[11px] text-ink-soft">
                    {quote.source || '未写出处'} · {dateLabel(quote.date)}
                  </span>
                </button>
              ))}
              {quotes.length === 0 ? (
                <p className="m-0 py-6 text-center text-[12.5px] text-ink">
                  还没有摘录。在素材里拖一张「摘录」卡片试试。
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel className="flex min-w-0 flex-[1_1_360px] flex-col p-[18px]">
            <PanelHeader
              label="清单"
              aside={`${checklists.length} 张 · ${checklists.reduce((sum, list) => sum + list.items.length, 0)} 项`}
            />
            <div className="flex flex-col gap-3">
              {checklists.slice(0, 5).map((list) => {
                const done = list.items.filter((item) => item.done).length
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={(): void => {
                      navigate(`/diary/${list.entryId}`)
                    }}
                    className="cursor-pointer rounded-xl border border-paper-line-soft bg-paper-card p-3 text-left hover:bg-paper-sunken"
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-strong">
                      {list.title || '清单'}
                      <span className="ml-auto font-display text-[11.5px] font-normal text-ink-soft">
                        {done} / {list.items.length} · {dateLabel(list.date)}
                      </span>
                    </span>
                    <span className="mt-1.5 flex flex-col gap-1">
                      {list.items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className={
                            item.done
                              ? 'flex items-center gap-1.5 text-[12px] text-ink-soft line-through'
                              : 'flex items-center gap-1.5 text-[12px] text-ink'
                          }
                        >
                          {item.done ? (
                            <Check size={11} />
                          ) : (
                            <span className="size-[11px] rounded-[4px] border border-paper-line-dash" />
                          )}
                          {item.text}
                        </span>
                      ))}
                      {list.items.length > 3 ? (
                        <Chip tone="line" size="sm">
                          还有 {list.items.length - 3} 项
                        </Chip>
                      ) : null}
                    </span>
                  </button>
                )
              })}
              {checklists.length === 0 ? (
                <p className="m-0 py-6 text-center text-[12.5px] text-ink">还没有清单卡片。</p>
              ) : null}
            </div>
          </Panel>

          <Panel tone="warm" className="flex min-w-0 flex-[1_1_320px] flex-col p-[18px]">
            <PanelHeader label="同步" aside="本地优先 · 手动触发" />
            {/* SyncToolbar 是内容宽度的紧凑胶囊，加 self-start 免得被 flex 拉伸成通栏。 */}
            <div className="self-start rounded-[11px] border border-paper-line-dash-strong bg-paper-card px-1.5 py-1">
              <SyncToolbar onSynced={(): void => void load()} />
            </div>
            <p className="m-0 mt-3 text-[11.5px] leading-[1.85] text-ink">
              数据都在本地：卡片、图片、页面底色。上传/下载是增量同步，断网时照常能写。
            </p>
          </Panel>
        </div>
      </main>
    </>
  )
}
