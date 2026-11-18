/**
 * 日记模块的壳：统一的纸感画布 + 数据装载。
 *
 * 数据只在进入日记模块时读一次（`ensurLoaded`），卡片板 / 日历 / 回顾 / 素材库
 * 都从 store 里派生。各页面自己渲染 `JournalToolbar`，因为右侧操作区各不相同。
 */
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useDiaryStore } from '../../stores/diaryStore'

export default function DiaryLayout(): JSX.Element {
  const ensureLoaded = useDiaryStore((state) => state.ensureLoaded)

  useEffect(() => {
    void ensureLoaded()
  }, [ensureLoaded])

  return (
    <div className="flex h-full flex-col bg-paper-canvas text-ink-strong">
      <Outlet />
    </div>
  )
}
