import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary specifically for Three.js/R3F components.
 * Catches errors during rendering and prevents them from crashing the whole app.
 * Also prevents React from trying to serialize Three.js objects in error reports.
 */
export class ThreeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error without trying to serialize Three.js objects
    console.error('Three.js rendering error:', error.message)
    console.error('Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ff0000" wireframe />
        </mesh>
      )
    }

    return this.props.children
  }
}

export default ThreeErrorBoundary
