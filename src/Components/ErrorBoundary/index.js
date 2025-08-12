// Main error boundary components
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as GlobalErrorBoundary } from './GlobalErrorBoundary';

// Hook-based error boundary
export { useErrorBoundary, withErrorBoundaryHook } from './useErrorBoundary.jsx';

// Fallback components
export { ErrorFallback } from './ErrorBoundary';

// Higher-order components
export { withErrorBoundary } from './ErrorBoundary'; 