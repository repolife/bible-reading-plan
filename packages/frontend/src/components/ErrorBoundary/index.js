// Main error boundary components
export { default as ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary';
export { default as GlobalErrorBoundary } from '@components/ErrorBoundary/GlobalErrorBoundary';

// Hook-based error boundary
export { useErrorBoundary, withErrorBoundaryHook } from '@components/ErrorBoundary/useErrorBoundary';

// Fallback components
export { ErrorFallback } from '@components/ErrorBoundary/ErrorBoundary';

// Higher-order components
export { withErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'; 