import React from "react";
import { Typography, Button, Card } from "@material-tailwind/react";
import * as Sentry from "@sentry/react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for development
    console.error("Error caught by boundary:", error, errorInfo);

    // Capture error with Sentry
    const errorId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        location: window.location.pathname,
        component: this.props.componentName || "Unknown",
      },
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Log additional context
    console.error("Error ID:", errorId);
    console.error("Component Stack:", errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleReportError = () => {
    if (this.state.errorId) {
      // Open Sentry issue in new tab
      const sentryUrl = `https://sentry.io/organizations/your-org/issues/?query=${this.state.errorId}`;
      window.open(sentryUrl, '_blank');
    }
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🚨</span>
              </div>
              <Typography variant="h4" color="red" className="mb-2">
                Oops! Something went wrong
              </Typography>
              <Typography color="gray" className="mb-6">
                We've encountered an unexpected error. Don't worry, we've been notified and are working on a fix.
              </Typography>
            </div>

            {this.state.error && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 text-left">
                <Typography variant="h6" color="red" className="mb-2">
                  Error Details
                </Typography>
                <Typography variant="small" color="red" className="font-mono text-xs mb-2">
                  {this.state.error.toString()}
                </Typography>
                {this.state.errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600 dark:text-red-400 mb-2">
                      Component Stack Trace
                    </summary>
                    <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {this.state.errorId && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                <Typography variant="small" color="blue-gray" className="mb-2">
                  Error Reference ID: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">{this.state.errorId}</code>
                </Typography>
                <Typography variant="small" color="blue-gray">
                  Please include this ID if you contact support.
                </Typography>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                color="blue" 
                onClick={this.handleRetry}
                className="flex-1 sm:flex-none"
              >
                🔄 Try Again
              </Button>
              <Button 
                color="gray" 
                onClick={this.handleGoHome}
                variant="outlined"
                className="flex-1 sm:flex-none"
              >
                🏠 Go Home
              </Button>
              {this.state.errorId && (
                <Button 
                  color="amber" 
                  onClick={this.handleReportError}
                  variant="outlined"
                  className="flex-1 sm:flex-none"
                >
                  📋 Report Issue
                </Button>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Typography variant="small" color="gray">
                If this problem persists, please contact support with the error ID above.
              </Typography>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = (Component, componentName = "Component") => {
  return (props) => (
    <ErrorBoundary componentName={componentName}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

// Fallback component for react-error-boundary
export const ErrorFallback = ({ error, resetErrorBoundary, componentName }) => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚨</span>
          </div>
          <Typography variant="h4" color="red" className="mb-2">
            Component Error
          </Typography>
          <Typography color="gray" className="mb-6">
            {componentName || "This component"} encountered an error and couldn't render properly.
          </Typography>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 text-left">
            <Typography variant="h6" color="red" className="mb-2">
              Error Details
            </Typography>
            <Typography variant="small" color="red" className="font-mono text-xs">
              {error.toString()}
            </Typography>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            color="blue" 
            onClick={resetErrorBoundary}
            className="flex-1 sm:flex-none"
          >
            🔄 Try Again
          </Button>
          <Button 
            color="gray" 
            onClick={() => window.location.href = "/"}
            variant="outlined"
            className="flex-1 sm:flex-none"
          >
            🏠 Go Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ErrorBoundary; 