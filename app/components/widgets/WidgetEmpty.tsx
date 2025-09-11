import React, { useState } from 'react';

interface WidgetEmptyProps {
  icon?: string;
  message: string;
  description?: string;
}

export function WidgetEmpty({ message, description }: WidgetEmptyProps) {
  return (
    <div className="bg-card dark:bg-secondaryBg p-4 rounded-2xl shadow text-center">
      <div className="text-secondary dark:text-secondaryDark">
        <div className="text-sm font-medium">{message}</div>
        {description && (
          <div className="text-xs text-secondary dark:text-secondaryDark mt-1">{description}</div>
        )}
      </div>
    </div>
  );
}

// Custom hook for widget error handling
export function useWidgetError() {
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown, context?: string) => {
    console.error(`Widget error${context ? ` (${context})` : ''}:`, err);
    
    if (err instanceof TypeError && err.message.includes('fetch')) {
      setError("Unable to connect to service");
    } else if (err instanceof Error) {
      // Parse common error patterns
      if (err.message.includes('404')) {
        setError("Service not found or not configured");
      } else if (err.message.includes('401') || err.message.includes('403')) {
        setError("Authentication failed - check API key");
      } else if (err.message.includes('timeout')) {
        setError("Service took too long to respond");
      } else if (err.message.includes('ECONNREFUSED')) {
        setError("Service is offline or unreachable");
      } else {
        setError(err.message);
      }
    } else {
      setError('Unknown error occurred');
    }
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
}