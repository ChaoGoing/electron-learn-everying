import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { ContentArea } from './ContentArea'

export function AppLayout(): JSX.Element {
  return (
    <div className="h-screen flex flex-col bg-surface-light dark:bg-surface-dark smooth-theme">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ContentArea />
      </div>
    </div>
  )
}