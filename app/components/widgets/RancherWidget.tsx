import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface RancherWidgetProps {
  serviceName: string;
  config: {
    url?: string;
    token?: string;
    clusterId?: string;
    refreshInterval?: number;
    [key: string]: any;
  };
}

interface RancherData {
  clusterHealth: string;
  clusterName: string;
  activeNodes: number;
  inactiveNodes: number;
  totalNodes: number;
  runningDeployments: number;
  totalPods: number;
  status: string;
}

export default function RancherWidget({ serviceName, config }: RancherWidgetProps) {
  const [data, setData] = useState<RancherData>({ 
    clusterHealth: 'unknown',
    clusterName: 'Unknown',
    activeNodes: 0, 
    inactiveNodes: 0,
    totalNodes: 0,
    runningDeployments: 0,
    totalPods: 0,
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useWidgetError();

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const response = await fetch(`/api/widget/rancher/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Rancher data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Rancher');
        setLoading(false);
      }
    };

    fetchData();
    
    const refreshInterval = config.refreshInterval || 30000; // Default 30 seconds for cluster data
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [serviceName, config.refreshInterval]);

  // Get health status color
  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'healthy':
      case 'active':
        return 'text-main dark:text-mainDark';
      case 'unhealthy':
      case 'error':
        return 'text-red-400';
      case 'warning':
      case 'updating':
        return 'text-yellow-500';
      default:
        return 'text-main dark:text-mainDark';
    }
  };

  // Loading state
  if (loading) {
    return <WidgetLoading type="skeleton" message="Loading cluster data..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Rancher" 
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
          {data.clusterHealth}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Health
        </div>
      </div>

      {/* Queue Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-1">
            {data.inactiveNodes > 0 && (
              <div className="relative group">
                <span className="w-2 h-2 bg-red-400 rounded-full inline-block cursor-pointer" />
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {data.inactiveNodes} inactive node{data.inactiveNodes !== 1 ? "s" : ""}
                </div>
            </div>
            )}
            <span className="text-sm font-bold text-main dark:text-mainDark">
              {data.activeNodes}/{data.totalNodes}
            </span>
          </div>
          <div className="text-xs text-secondary dark:text-secondaryDark">
            Nodes
          </div>
        </div>

      {/* Total Movies Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.runningDeployments}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Deployed
        </div>
      </div>
    </div>
  );
}