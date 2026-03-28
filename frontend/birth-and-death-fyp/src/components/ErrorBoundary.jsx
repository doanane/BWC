import { Component } from 'react';

function isChunkLoadError(error) {
  const msg = error?.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', isChunkError: false, retried: false };
    this.handleRetry = this.handleRetry.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || String(error),
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
    if (isChunkLoadError(error) && !this.state.retried) {
      this.setState({ retried: true });
      window.location.reload();
    }
  }

  handleRetry() {
    this.setState({ hasError: false, errorMessage: '', isChunkError: false, retried: false });
  }

  handleGoHome() {
    this.setState({ hasError: false, errorMessage: '', isChunkError: false, retried: false });
    window.location.href = '/';
  }

  render() {
    if (this.state.hasError && !this.state.retried) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '2rem', background: 'var(--bg)',
        }}>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary-100)', marginBottom: 16 }}>
            {this.state.isChunkError ? '⟳' : '500'}
          </div>
          <h2 style={{ color: 'var(--text)', marginBottom: 8, fontFamily: 'Poppins,sans-serif' }}>
            {this.state.isChunkError ? 'Page failed to load' : 'Something went wrong'}
          </h2>
          {import.meta.env.DEV && this.state.errorMessage && (
            <pre style={{
              background: '#fee2e2', color: '#991b1b', padding: '10px 16px',
              borderRadius: 8, fontSize: '0.78rem', maxWidth: 500,
              textAlign: 'left', whiteSpace: 'pre-wrap', marginBottom: 16,
            }}>
              {this.state.errorMessage}
            </pre>
          )}
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, maxWidth: 420 }}>
            {this.state.isChunkError
              ? 'A required resource could not be loaded. Refreshing will fix this.'
              : 'This page encountered an unexpected error. Please try again.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={this.handleGoHome}>
              Return Home
            </button>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
