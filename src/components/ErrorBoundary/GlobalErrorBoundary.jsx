import React from "react";
import { Typography, Button, Card } from "@material-tailwind/react";
import * as Sentry from "@sentry/react";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      errorBoundaryError: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global error caught:", error, errorInfo);

    // Capture error with Sentry
    const errorId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        location: window.location.pathname,
        errorType: "global",
        timestamp: new Date().toISOString(),
      },
    });

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Log additional context
    console.error("Global Error ID:", errorId);
    console.error("Global Component Stack:", errorInfo.componentStack);
  }

  // Handle errors from error boundaries
  static getDerivedStateFromProps(props, state) {
    if (props.error) {
      return {
        hasError: true,
        errorBoundaryError: props.error,
      };
    }
    return null;
  }

  handleRetry = () => {
    // Try to reset the error state
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      errorBoundaryError: null
    });
    
    // Force a page reload as a fallback
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleReportError = () => {
    if (this.state.errorId) {
      const sentryUrl = `https://sentry.io/organizations/your-org/issues/?query=${this.state.errorId}`;
      window.open(sentryUrl, '_blank');
    }
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error || this.state.errorBoundaryError;
      const errorInfo = this.state.errorInfo;

      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
          <Card className="max-w-3xl w-full p-8 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">💥</span>
              </div>
              <Typography variant="h3" color="red" className="mb-2">
                Critical Application Error
              </Typography>
              <Typography color="gray" className="mb-6 text-lg">
                We've encountered a serious error that prevented the application from running properly.
                Our team has been automatically notified and is working on a solution.
              </Typography>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 text-left">
                <Typography variant="h6" color="red" className="mb-2">
                  Error Information
                </Typography>
                <Typography variant="small" color="red" className="font-mono text-xs mb-2">
                  {error.toString()}
                </Typography>
                {errorInfo && errorInfo.componentStack && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600 dark:text-red-400 mb-2">
                      Component Stack Trace
                    </summary>
                    <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {this.state.errorId && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                <Typography variant="small" color="primary" className="mb-2">
                  Error Reference ID: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded font-mono">{this.state.errorId}</code>
                </Typography>
                <Typography variant="small" color="primary">
                  Please save this ID and include it when contacting support.
                </Typography>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
              <Typography variant="small" color="yellow-800 dark:text-yellow-200">
                <strong>What happened?</strong> This error occurred in the application's core functionality. 
                It may be related to a recent update or an unexpected data format.
              </Typography>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button 
                color="blue" 
                onClick={this.handleRetry}
                size="lg"
                className="flex-1 sm:flex-none"
              >
                🔄 Reload Application
              </Button>
              <Button 
                color="gray" 
                onClick={this.handleGoHome}
                variant="outlined"
                size="lg"
                className="flex-1 sm:flex-none"
              >
                🏠 Go Home
              </Button>
              {this.state.errorId && (
                <Button 
                  color="amber" 
                  onClick={this.handleReportError}
                  variant="outlined"
                  size="lg"
                  className="flex-1 sm:flex-none"
                >
                  📋 Report Issue
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <Typography variant="h6" color="primary" className="mb-2">
                  Immediate Actions
                </Typography>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Try reloading the page</li>
                  <li>• Clear your browser cache</li>
                  <li>• Check your internet connection</li>
                  <li>• Try a different browser</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <Typography variant="h6" color="primary" className="mb-2">
                  If Problem Persists
                </Typography>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Contact support with error ID</li>
                  <li>• Check our status page</li>
                  <li>• Report the issue on GitHub</li>
                  <li>• Wait for our team to resolve</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Typography variant="small" color="gray">
                We apologize for the inconvenience. Our team is working to resolve this issue as quickly as possible.
              </Typography>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary; 