import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem', fontFamily: 'sans-serif', color: '#c00',
          maxWidth: '600px', margin: '0 auto', background: '#fff5f5',
          borderRadius: '8px', border: '1px solid #feb2b2', minHeight: '100vh'
        }}>
          <h2 style={{ margin: '0 0 1rem' }}>오류가 발생했습니다</h2>
          <pre style={{ overflow: 'auto', fontSize: '12px' }}>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
