import { useState, useEffect, useCallback } from 'react';
import * as Sentry from "@sentry/react";

export const useErrorBoundary = (componentName = "Component") => {
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [errorId, setErrorId] = useState(null);

  const handleError = useCallback((error, errorInfo) => {
    console.error(`Error in ${componentName}:`, error, errorInfo);

    // Capture error with Sentry
    const sentryErrorId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo?.componentStack,
        },
      },
      tags: {
        location: window.location.pathname,
        component: componentName,
        errorType: "hook_boundary",
        timestamp: new Date().toISOString(),
      },
    });

    setError(error);
    setErrorInfo(errorInfo);
    setErrorId(sentryErrorId);

    // Log additional context
    console.error("Error ID:", sentryErrorId);
    if (errorInfo?.componentStack) {
      console.error("Component Stack:", errorInfo.componentStack);
    }
  }, [componentName]);

  const resetError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
    setErrorId(null);
  }, []);

  // Global error handler
  useEffect(() => {
    const handleGlobalError = (event) => {
      handleError(event.error, {
        componentStack: event.error?.stack || "No stack trace available"
      });
    };

    const handleUnhandledRejection = (event) => {
      handleError(new Error(event.reason), {
        componentStack: "Unhandled Promise Rejection"
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleError]);

  return {
    error,
    errorInfo,
    errorId,
    hasError: !!error,
    handleError,
    resetError,
  };
};

// Higher-order component for functional components
export const withErrorBoundaryHook = (Component, componentName = "Component") => {
  return (props) => {
    const { error, hasError, resetError } = useErrorBoundary(componentName);

    if (hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full p-8 text-center bg-white dark:bg-neutral-800 rounded-lg shadow-lg">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🚨</span>
              </div>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                Component Error
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {componentName} encountered an error and couldn't render properly.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                  Error Details
                </h3>
                <p className="text-red-600 dark:text-red-400 font-mono text-sm">
                  {error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={resetError}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🔄 Try Again
              </button>
              <button 
                onClick={() => window.location.href = "/"}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}; 