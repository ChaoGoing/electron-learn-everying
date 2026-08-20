import { Search } from 'lucide-react'

export default function SearchPage(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Search size={48} className="mx-auto mb-4 text-text-secondary-light dark:text-text-secondary-dark" />
        <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">全局搜索</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
          搜索日记、博客、项目（即将上线）
        </p>
      </div>
    </div>
  )
}