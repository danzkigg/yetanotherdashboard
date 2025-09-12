import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface ProxmoxWidgetProps {
  serviceName: string;
  config: {
    url?: string;
    token?: string;
    skipTLSVerify?: boolean;
    refreshInterval?: number;
    [key: string]: any;
  };
}

interface ProxmoxData {
  nodes: {
    total: number;
    active: number;
    inactive: number;
  };
  vms: {
    total: number;
    running: number;
    stopped: number;
  };
  lxc: {
    total: number;
    running: number;
    stopped: number;
  };
  status: string;
}

export default function ProxmoxWidget({ serviceName, config }: ProxmoxWidgetProps) {
  const [data, setData] = useState<ProxmoxData>({ 
    nodes: {
      total: 0,
      active: 0,
      inactive: 0
    },
    vms: {
      total: 0,
      running: 0,
      stopped: 0
    },
    lxc: {
      total: 0,
      running: 0,
      stopped: 0
    },
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useWidgetError();

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const response = await fetch(`/api/widget/proxmox/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Proxmox data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Proxmox');
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
    return <WidgetLoading type="skeleton" message="Loading cluster data..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Proxmox" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Success state
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {/* Nodes Status Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-1">
          {data.nodes.inactive > 0 && (
            <div className="relative group">
              <span className="w-2 h-2 bg-red-400 rounded-full inline-block cursor-pointer" />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {data.nodes.inactive} inactive node{data.nodes.inactive !== 1 ? "s" : ""}
              </div>
            </div>
          )}
          <span className="text-sm font-bold text-main dark:text-mainDark">
            {data.nodes.active}/{data.nodes.total}
          </span>
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Nodes
        </div>
      </div>

      {/* VMs Status Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.vms.running}/{data.vms.total}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          VMs
        </div>
      </div>

      {/* LXC Status Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.lxc.running}/{data.lxc.total}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          LXC
        </div>
      </div>
    </div>
  );
}