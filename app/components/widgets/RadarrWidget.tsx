import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface RadarrWidgetProps {
  serviceName: string;
  config: {
    url?: string;
    key?: string;
    refreshInterval?: number;
    [key: string]: any;
  };
}

interface RadarrData {
  total: number;
  wanted: number;
  queue: number;
  upcoming: any[];
  status: string;
}

export default function RadarrWidget({ serviceName, config }: RadarrWidgetProps) {
  const [data, setData] = useState<RadarrData>({ 
    total: 0, 
    wanted: 0, 
    queue: 0, 
    upcoming: [],
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useWidgetError();

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const response = await fetch(`/api/widget/radarr/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Radarr data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Radarr');
        setLoading(false);
      }
    };

    fetchData();
    
    const refreshInterval = config.refreshInterval || 10000;
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [serviceName, config.refreshInterval]);

  // Loading state
  if (loading) {
    return <WidgetLoading type="skeleton" message="Loading movie data..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Radarr" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Success state
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {/* Wanted Movies Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.wanted}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Wanted
        </div>
      </div>

      {/* Queue Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.queue}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Queue
        </div>
      </div>

      {/* Total Movies Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.total}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Movies
        </div>
      </div>
    </div>
  );
}