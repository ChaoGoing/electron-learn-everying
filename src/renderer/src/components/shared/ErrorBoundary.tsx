import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-mica-light dark:bg-mica-dark">
          <div className="text-center max-w-md p-8">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
            <h1 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
              出错了
            </h1>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <Button onClick={this.handleReset} className="gap-2">
              <RefreshCw size={16} />
              <span>重试</span>
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
