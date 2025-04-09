# Chat Application

This provides comprehensive details about the documentation for the application different architecture explanations and stuff.

## Table of Content 
[Error Handling](#error-handling-system)

[Unread Messages Implementation](#unread-messages-implementation)

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

## Unread Messages Implementation

### Overview

This implementation adds unread message tracking and display to the chat application. When a user receives a new message, a counter is displayed showing the number of unread messages. The unread count is cleared when the user opens the conversation.

### Backend Components

#### 1. Redis Integration
- Added a Redis client to store ephemeral data like unread message counts
- Implemented connection and error handling for Redis

#### 2. Unread Messages Service
- Created a service to track unread message counts in Redis
- Implemented methods for:
  - Incrementing unread counts when new messages arrive
  - Getting unread counts for a specific conversation
  - Getting all unread counts for a user
  - Marking messages as read
  - Getting total unread count

#### 3. Direct Message and Channel Service Updates
- Updated to increment unread counts when messages are sent
- Added methods to mark messages as read
- Modified to exclude the sender from unread notifications

#### 4. API Endpoints
- Added endpoints to mark messages as read
- Added endpoint to get all unread counts for the authenticated user

#### 5. Socket Handlers
- Updated to emit real-time unread count updates
- Added handlers for marking messages as read through sockets
- Added unread count initialization on socket connection

### Frontend Components

#### 1. UI Components
- Created `UnreadBadge` component to display unread counts
- Updated conversation lists to show unread counts
- Updated the user avatar to show total unread count
- Added document title updates for unread messages

#### 2. React Hooks
- Created `useUnreadCounts` hook to access and manage unread counts
- Created `useMarkAsRead` hook to mark messages as read
- Updated existing hooks to work with unread functionality

#### 3. Real-time Updates
- Set up socket event listeners for unread count updates
- Implemented automatic marking of messages as read when a conversation is opened
- Ensured unread counts are properly invalidated and refreshed

#### 4. Data Flow
- Unread counts are fetched on initial load
- Counts are updated in real-time via socket events
- Counts are stored locally for immediate UI feedback
- Counts are synchronized with the server via API/sockets

### Key Features

1. **New Message Indicators**: Blue dots with count show unread messages
2. **Section Aggregation**: Total unread counts shown for DM and Channel sections
3. **Global Notification**: Total unread count shown on user avatar
4. **Browser Tab Updates**: Document title shows unread count
5. **Automatic Read Marking**: Messages are marked as read when conversation is viewed
6. **Real-time Updates**: Counts update instantly when new messages arrive

### Technical Details

- Using Redis for storing ephemeral unread counts
- TTL of 30 days for unread message keys
- Socket.io for real-time notifications
- React Query for data fetching and cache management
- Local state syncing for immediate UI feedback

This implementation provides a complete solution for tracking and displaying unread messages, enhancing the user experience by clearly indicating when new messages have arrived.