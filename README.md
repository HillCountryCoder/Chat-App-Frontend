# Chat Application

This provides comprehensive details about the documentation for the application different architecture explanations and stuff.

## Table of Content 
[Error Handling](#error-handling-system)

## Error Handling System

This document explains the comprehensive error handling system implemented in our frontend application.

### Overview

The error handling system provides a consistent way to handle errors across the application. It includes:

1. **Error Types & Classes**: Mirrors backend error structure for consistency
2. **API Client Integration**: Automatic error transformation and handling
3. **UI Components**: Reusable error display components
4. **Context Provider**: Global error management
5. **Helper Hooks**: For simplified error handling in components

#### Key Components

#### Error Types & Classes

- **BaseError**: Abstract base class for all errors
- **Specific Error Classes**: NotFoundError, ValidationError, etc.
- **Error Factory**: Functions to create appropriate error instances

#### API Client

- **Error Interceptors**: Transforms API errors into our error types
- **Typed Responses**: Better type safety for API requests

#### UI Components

- **ApiErrorDisplay**: Reusable component for displaying errors
- **ErrorBoundary**: Catches and displays errors in component trees

#### Context & Providers

- **ErrorProvider**: Manages global errors and provides error handling utilities
- **useError Hook**: Simplified access to error handling functions

#### Helper Hooks

- **useAsync**: Hook for handling async operations with error handling
- **withErrorHandling**: HOF for wrapping functions with error handling

### Usage Examples

#### Handling API Errors

```tsx
// Using the API client with error handling
import { apiClient } from "@/lib/api";
import { useError } from "@/providers/error-provider";

function UserProfile() {
  const { handleError } = useError();

  async function fetchUserData() {
    try {
      const user = await apiClient.get("/users/me");
      return user;
    } catch (error) {
      // Error is already transformed to a BaseError
      handleError(error, { showToast: true });
      return null;
    }
  }

  // ...
}
```

#### Using useAsync Hook

```tsx
import { useAsync } from "@/hooks/use-async";
import { apiClient } from "@/lib/api";

function UserProfile() {
  const {
    execute: fetchUser,
    data: user,
    isLoading,
    error,
  } = useAsync(() => apiClient.get("/users/me"), {
    showErrorToast: true,
    autoRun: true,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <ApiErrorDisplay error={error} />;

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      {/* ... */}
    </div>
  );
}
```

#### Form Handling

```tsx
import { apiClient } from "@/lib/api";
import { ApiErrorDisplay } from "@/components/ui/api-error";
import { useState } from "react";

function LoginForm() {
  const [error, setError] = useState(null);

  const handleSubmit = async (data) => {
    try {
      await apiClient.post("/auth/login", data);
      // Success handling
    } catch (error) {
      // Set the error for display in the form
      setError(error);
    }
  };

  return (
    <form onSubmit={handleFormSubmit}>
      {/* Form fields */}

      {error && <ApiErrorDisplay error={error} />}

      <button type="submit">Login</button>
    </form>
  );
}
```

### Best Practices

1. **Use the API client** for all API requests to ensure consistent error handling
2. **Prefer useAsync or withErrorHandling** for simplified error handling
3. **For form errors**, display them inline using the ApiErrorDisplay component
4. **For unexpected errors**, use the ErrorBoundary component
5. **For global notifications**, use the ErrorProvider's setGlobalError function

### Error Code Mapping

The system maps error codes to appropriate UI treatments:

| Error Code            | Toast | Inline Display | Default Action     |
| --------------------- | ----- | -------------- | ------------------ |
| VALIDATION_ERROR      | No    | Yes            | Show field errors  |
| NOT_FOUND             | No    | Yes            | Show 404 message   |
| UNAUTHORIZED          | No    | Yes            | Redirect to login  |
| FORBIDDEN             | No    | Yes            | Show access denied |
| NETWORK_ERROR         | Yes   | Optional       | Retry option       |
| INTERNAL_SERVER_ERROR | Yes   | Optional       | Contact support    |

### Extending the System

To add new error types:

1. Add the error code to `ErrorCodes` in `types.ts`
2. Create a new error class extending `BaseError`
3. Add the error handling logic to `factory.ts`
4. Update UI components if needed
