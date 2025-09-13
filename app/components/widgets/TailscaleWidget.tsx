import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface TailscaleWidgetProps {
  serviceName: string;
  config: {
    apiKey?: string;
    tailnet?: string;
    refreshInterval?: number;
    [key: string]: any;
  };
}

interface TailscaleData {
  devices: {
    total: number;
    online: number;
    offline: number;
    recentActivity: Array<{
      name: string;
      user: string;
      lastSeen: string;
      online: boolean;
      addresses: string[];
      os: string;
    }>;
  };
  status: string;
}

export default function TailscaleWidget({ serviceName, config }: TailscaleWidgetProps) {
  const [data, setData] = useState<TailscaleData>({ 
    devices: {
      total: 0,
      online: 0,
      offline: 0,
      recentActivity: []
    },
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useWidgetError();

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const response = await fetch(`/api/widget/tailscale/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Tailscale data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Tailscale');
        setLoading(false);
      }
    };

    fetchData();
    
    const refreshInterval = config.refreshInterval || 30000; // Default 30 seconds
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [serviceName, config.refreshInterval]);

  // Loading state
  if (loading) {
    return <WidgetLoading type="skeleton" message="Loading network data..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Tailscale" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Success state
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {/* Online Devices Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.devices.online}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Online
        </div>
      </div>

      {/* Offline Devices Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.devices.offline}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Offline
        </div>
      </div>

      {/* Total Devices Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.devices.total}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Total
        </div>
      </div>
    </div>
  );
}