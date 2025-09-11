import { useState } from "react";

interface WidgetErrorProps {
  title: string;
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function WidgetError({ title, error, onRetry, showRetry = true }: WidgetErrorProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-700/50">
      <div className="flex items-start space-x-3">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-red-400" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-red-800 dark:text-red-200">
            {title} Error
          </div>
          <div className="text-xs text-red-600 dark:text-red-300 mt-1 break-words">
            {error}
          </div>
          {showRetry && (
            <button 
              onClick={onRetry || (() => window.location.reload())} 
              className="text-xs text-red-600 dark:text-red-400 underline hover:no-underline mt-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded"
            >
              Retry
            </button>
          )}
        </div>
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