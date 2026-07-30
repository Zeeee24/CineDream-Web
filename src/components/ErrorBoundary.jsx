import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/CineDream-Web/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          gap: 16,
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Something went wrong</h2>
          <p style={{ margin: 0, color: '#888', fontSize: '0.9rem', maxWidth: 400 }}>
            The player encountered an unexpected error. You can try again or go back home.
          </p>
          {this.state.error && (
            <p style={{ margin: 0, color: '#555', fontSize: '0.75rem', maxWidth: 500, wordBreak: 'break-all' }}>
              {this.state.error.message}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#6c5ce7',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
