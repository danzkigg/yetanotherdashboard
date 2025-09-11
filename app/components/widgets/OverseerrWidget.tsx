import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface OverseerrWidgetProps {
  serviceName: string;
  config: {
    url?: string;
    key?: string;
    refreshInterval?: number;
    [key: string]: any;
  };
}

interface OverseerrData {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  availableRequests: number;
  processingRequests: number;
  recentRequests: Array<{
    id: number;
    title: string;
    type: 'movie' | 'tv';
    status: string;
    requestedDate: string;
    requestedBy: string;
  }>;
  quotaInfo?: {
    movieQuotaEnabled: boolean;
    tvQuotaEnabled: boolean;
    movieQuotaLimit: number;
    tvQuotaLimit: number;
  } | null;
  stats: {
    movies: number;
    tv: number;
    users: number;
  };
  status: string;
}

export default function OverseerrWidget({ serviceName, config }: OverseerrWidgetProps) {
  const [data, setData] = useState<OverseerrData>({ 
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    availableRequests: 0,
    processingRequests: 0,
    recentRequests: [],
    quotaInfo: null,
    stats: {
      movies: 0,
      tv: 0,
      users: 0
    },
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const [showRecentRequests, setShowRecentRequests] = useState(false);
  const { error, handleError, clearError } = useWidgetError();

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const response = await fetch(`/api/widget/overseerr/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Overseerr data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Overseerr');
        setLoading(false);
      }
    };

    fetchData();
    
    const refreshInterval = config.refreshInterval || 15000; // Default 15 seconds
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [serviceName, config.refreshInterval]);

  // Loading state
  if (loading) {
    return <WidgetLoading type="skeleton" message="Loading Overseerr data..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Overseerr" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Success state
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {/* Pending */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.pendingRequests}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Pending
        </div>
      </div>

      {/* Processing */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.processingRequests}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Processing
        </div>
      </div>

      {/* Available */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.availableRequests}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Available
        </div>
      </div>
    </div>
  );
}