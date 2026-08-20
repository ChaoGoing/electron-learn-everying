import { PenLine } from 'lucide-react'

export default function BlogPage(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <PenLine size={48} className="mx-auto mb-4 text-text-secondary-light dark:text-text-secondary-dark" />
        <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">博客</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
          Markdown 编辑 & 实时预览（即将上线）
        </p>
      </div>
    </div>
  )
}