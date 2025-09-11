import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface SonarrWidgetProps {
  serviceName: string;
  config: {
    url?: string;
    key?: string;
    refreshInterval?: number;
    [key: string]: any;
  };
}

interface SonarrData {
  total: number;
  wanted: number;
  queue: number;
  upcoming: any[];
  status: string;
}

export default function SonarrWidget({ serviceName, config }: SonarrWidgetProps) {
  const [data, setData] = useState<SonarrData>({ 
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
        
        const response = await fetch(`/api/widget/sonarr/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Sonarr data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Sonarr');
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
    return <WidgetLoading type="skeleton" message="Loading series data..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Sonarr" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Success state
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {/* Wanted Episodes Box */}
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

      {/* Total TV Shows Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.total}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Series
        </div>
      </div>
    </div>
  );
}