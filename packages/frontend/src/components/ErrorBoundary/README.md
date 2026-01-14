# Error Boundaries for Bible Reading Plan App

This directory contains comprehensive error boundary components to catch and handle errors gracefully throughout your application.

## 🚨 Components

### 1. `ErrorBoundary` (Class-based)
- **Purpose**: Catch errors in React components
- **Usage**: Wrap individual components or sections
- **Features**: 
  - Error logging to console
  - Sentry integration
  - Custom fallback UI
  - Retry functionality

### 2. `GlobalErrorBoundary` (Class-based)
- **Purpose**: Catch unhandled errors at the application level
- **Usage**: Wraps the entire app in `main.jsx`
- **Features**:
  - Catches all unhandled errors
  - Comprehensive error reporting
  - User-friendly error messages
  - Recovery options

### 3. `useErrorBoundary` (Hook-based)
- **Purpose**: Error handling in functional components
- **Usage**: Custom hook for error state management
- **Features**:
  - React hooks compatible
  - Global error catching
  - Promise rejection handling

## 📖 Usage Examples

### Basic Component Wrapping

```jsx
import { ErrorBoundary } from '../ErrorBoundary';

// Wrap individual components
<ErrorBoundary componentName="FamilyGroupForm">
  <FamilyGroupForm />
</ErrorBoundary>

// Wrap sections
<ErrorBoundary componentName="ProfileSection">
  <AccountProfile />
  <FamilyGroupForm />
</ErrorBoundary>
```

### Using Higher-Order Components

```jsx
import { withErrorBoundary } from '../ErrorBoundary';

const ProtectedFamilyGroupForm = withErrorBoundary(FamilyGroupForm, "FamilyGroupForm");

// Use as normal component
<ProtectedFamilyGroupForm />
```

### Hook-based Error Boundary

```jsx
import { useErrorBoundary } from '../ErrorBoundary';

const MyComponent = () => {
  const { error, hasError, resetError } = useErrorBoundary("MyComponent");

  if (hasError) {
    return <div>Error occurred! <button onClick={resetError}>Retry</button></div>;
  }

  // Your component logic
  return <div>Component content</div>;
};
```

### Functional Component Wrapper

```jsx
import { withErrorBoundaryHook } from '../ErrorBoundary';

const ProtectedComponent = withErrorBoundaryHook(MyComponent, "MyComponent");

// Use as normal component
<ProtectedComponent />
```

## 🎯 Best Practices

### 1. **Strategic Placement**
- Wrap critical components (forms, data displays)
- Wrap route components
- Wrap third-party integrations

### 2. **Component Naming**
- Always provide descriptive `componentName` props
- Use the actual component name for better debugging
- Example: `componentName="FamilyGroupForm"`

### 3. **Error Recovery**
- Provide clear retry mechanisms
- Give users alternative actions
- Log errors for debugging

### 4. **User Experience**
- Show friendly error messages
- Provide helpful recovery steps
- Don't expose sensitive error details

## 🔧 Configuration

### Sentry Integration
- Automatically captures errors with context
- Includes component stack traces
- Tags errors with location and component info

### Error Logging
- Console logging for development
- Structured error information
- Component stack traces

### Fallback UI
- Consistent error message design
- Material Tailwind styling
- Dark/light theme support
- Responsive layout

## 🚀 Integration

The error boundaries are already integrated into your app:

1. **Global Error Boundary**: Wraps entire app in `main.jsx`
2. **Component Error Boundaries**: Available for individual components
3. **Hook-based Boundaries**: For functional component error handling

## 📝 Example Implementation

```jsx
// In your component file
import { ErrorBoundary } from '../ErrorBoundary';

export const MyComponent = () => {
  return (
    <ErrorBoundary componentName="MyComponent">
      {/* Your component content */}
    </ErrorBoundary>
  );
};

// Or use the HOC pattern
export default withErrorBoundary(MyComponent, "MyComponent");
```

## 🆘 Troubleshooting

### Common Issues
1. **Error boundaries not catching errors**: Ensure they're properly nested
2. **Sentry not reporting**: Check your Sentry DSN configuration
3. **Fallback UI not showing**: Verify error boundary placement

### Debug Tips
- Check browser console for error logs
- Verify Sentry dashboard for error reports
- Test with intentional errors to verify boundaries work

## 🔄 Error Recovery

### Automatic Recovery
- Component-level retry functionality
- State reset capabilities
- Navigation fallbacks

### Manual Recovery
- User-initiated retry buttons
- Home navigation options
- Support contact information

---

**Note**: Error boundaries only catch errors in the component tree below them. They don't catch errors in:
- Event handlers
- Asynchronous code (setTimeout, requestAnimationFrame, etc.)
- Server-side rendering
- Errors thrown in the error boundary itself 