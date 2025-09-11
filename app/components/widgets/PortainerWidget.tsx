import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface PortainerWidgetProps {
  serviceName: string;
  config: {
    url?: string;
    token?: string;
    endpointId?: number;
    refreshInterval?: number;
    [key: string]: any;
  };
}

interface PortainerData {
  containers: {
    total: number;
    running: number;
    stopped: number;
    paused: number;
    restarting: number;
    created: number;
    dead: number;
    removing: number;
    exited: number;
    recent: Array<{
      id: string;
      name: string;
      image: string;
      state: string;
      status: string;
      created: string;
      ports: string[];
    }>;
  };
  stacks: {
    total: number;
    active: number;
    inactive: number;
    recent: Array<{
      id: number;
      name: string;
      status: string;
      type: string;
      env: string;
      created: string | null;
      updated: string | null;
    }>;
  };
  endpoint: {
    id: number;
    name: string;
    status: number;
    type: number;
  };
  status: string;
}

export default function PortainerWidget({ serviceName, config }: PortainerWidgetProps) {
  const [data, setData] = useState<PortainerData>({ 
    containers: {
      total: 0,
      running: 0,
      stopped: 0,
      paused: 0,
      restarting: 0,
      created: 0,
      dead: 0,
      removing: 0,
      exited: 0,
      recent: []
    },
    stacks: {
      total: 0,
      active: 0,
      inactive: 0,
      recent: []
    },
    endpoint: {
      id: 1,
      name: 'Unknown',
      status: 1,
      type: 1
    },
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useWidgetError();

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const response = await fetch(`/api/widget/portainer/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Portainer data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Portainer');
        setLoading(false);
      }
    };

    fetchData();
    
    const refreshInterval = config.refreshInterval || 10000; // Default 10 seconds
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [serviceName, config.refreshInterval]);

  // Loading state
  if (loading) {
    return <WidgetLoading type="skeleton" message="Loading containers..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Portainer" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Success state
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {/* Running Containers Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.containers.running}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Running
        </div>
      </div>

      {/* Stopped Containers Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.containers.stopped + data.containers.exited}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Stopped
        </div>
      </div>

      {/* Total Containers Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.containers.total}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Total
        </div>
      </div>
    </div>
  );
}