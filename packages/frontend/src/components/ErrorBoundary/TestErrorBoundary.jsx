import React, { useState } from "react";
import { Button, Card, Typography } from "@material-tailwind/react";
import { ErrorBoundary } from "./index";

// Component that can throw an error
const BuggyComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("This is a test error to demonstrate error boundaries!");
  }

  return (
    <Card className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
      <Typography variant="h6" color="green" className="mb-2">
        ✅ Component Working Normally
      </Typography>
      <Typography color="gray">
        This component is functioning correctly. No errors here!
      </Typography>
    </Card>
  );
};

// Test component to demonstrate error boundaries
export const TestErrorBoundary = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [key, setKey] = useState(0);

  const triggerError = () => {
    setShouldThrow(true);
  };

  const resetComponent = () => {
    setShouldThrow(false);
    setKey(prev => prev + 1); // Force re-render
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <Typography variant="h4" color="primary" className="mb-2">
          🧪 Error Boundary Test
        </Typography>
        <Typography color="gray" className="mb-6">
          Test the error boundaries by triggering errors and seeing how they're handled.
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test with Error Boundary */}
        <div>
          <Typography variant="h6" color="primary" className="mb-3">
            With Error Boundary Protection
          </Typography>
          <ErrorBoundary componentName="BuggyComponent">
            <BuggyComponent key={key} shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>

        {/* Test without Error Boundary */}
        <div>
          <Typography variant="h6" color="primary" className="mb-3">
            Without Error Boundary (Will Crash)
          </Typography>
          <BuggyComponent key={key} shouldThrow={shouldThrow} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          color="red" 
          onClick={triggerError}
          className="flex-1 sm:flex-none"
        >
          🚨 Trigger Error
        </Button>
        <Button 
          color="green" 
          onClick={resetComponent}
          className="flex-1 sm:flex-none"
        >
          🔄 Reset Component
        </Button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <Typography variant="h6" color="primary" className="mb-2">
          📋 Test Instructions
        </Typography>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
          <li>Click "Trigger Error" to see how the error boundary catches errors</li>
          <li>Notice the left component shows a friendly error message</li>
          <li>The right component will crash the entire app (demonstrating why error boundaries are important)</li>
          <li>Click "Reset Component" to restore normal functionality</li>
        </ol>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
        <Typography variant="h6" color="amber" className="mb-2">
          ⚠️ Important Notes
        </Typography>
        <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
          <li>Error boundaries only catch errors in the component tree below them</li>
          <li>They don't catch errors in event handlers or async code</li>
          <li>Always wrap critical components with error boundaries</li>
          <li>Provide meaningful fallback UI for better user experience</li>
        </ul>
      </div>
    </div>
  );
};

