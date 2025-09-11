interface WidgetLoadingProps {
  message?: string;
  type?: 'spinner' | 'skeleton' | 'dots';
}

export function WidgetLoading({ message = "Loading...", type = 'spinner' }: WidgetLoadingProps) {
  if (type === 'skeleton') {
    return (
      <div className="flex gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="text-sm font-bold text-main dark:text-mainDark mb-1 animate-pulse">
              --
            </div>
            <div className="text-xs text-secondary dark:text-secondaryDark animate-pulse">
              Loading...
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <div className="text-sm text-secondary dark:text-secondaryDark mt-2">{message}</div>
      </div>
    );
  }

  // Default spinner
  return (
    <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
      <div className="flex items-center justify-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
        <span className="text-sm text-secondary dark:text-secondaryDark">{message}</span>
      </div>
    </div>
  );
}