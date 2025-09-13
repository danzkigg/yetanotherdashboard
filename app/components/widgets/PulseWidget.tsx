import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading";

interface PulseWidgetProps {
  serviceName: string;
  config: {
    url?: string;
    apiToken?: string;
    username?: string;
    password?: string;
    skipTLSVerify?: boolean;
    refreshInterval?: number;
    status?: 'all' | 'running' | 'stopped';
    vm?: boolean;
    lxc?: boolean;
    showNodes?: boolean;
    showMetrics?: boolean;
    [key: string]: any;
  };
}

interface PulseData {
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
  health?: any;
  error?: string;
  rawResponse?: any;
  diagnostics?: {
    version?: string;
    uptime?: number;
    connections?: Array<{
      name: string;
      connected: boolean;
      host: string;
      authMethod: string;
      nodeCount?: number;
      vmsFound?: number;
      vmsWithAgent?: number;
      problematicVMs?: Array<{
        name: string;
        issue: string;
      }>;
      version?: string;
    }>;
    system?: {
      os: string;
      arch: string;
      numCPU: number;
      memoryMB: number;
    };
    errors?: string[];
  };
  status: string;
}

export default function PulseWidget({ serviceName, config }: PulseWidgetProps) {
  const [data, setData] = useState<PulseData>({
    nodes: { total: 0, active: 0, inactive: 0 },
    vms: { total: 0, running: 0, stopped: 0 },
    lxc: { total: 0, running: 0, stopped: 0 },
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const { error, handleError, clearError } = useWidgetError();

  // Helper functions
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const response = await fetch(`/api/widget/pulse/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Pulse data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Pulse');
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
    return <WidgetLoading type="skeleton" message="Loading Pulse data..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Pulse" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Determine layout based on configuration
  const showNodes = config.showNodes !== false;
  const showVMs = config.vm !== false;
  const showLXC = config.lxc !== false;
  const showMetrics = config.showMetrics === true;

  // Count active sections for grid layout
  let activeSections = 0;
  if (showNodes) activeSections++;
  if (showVMs) activeSections++;
  if (showLXC) activeSections++;

  // Determine grid columns based on active sections
  const getGridCols = () => {
    if (activeSections <= 2) return `grid-cols-${activeSections}`;
    return 'grid-cols-3';
  };

  return (
    <div className="w-full space-y-3">
      {/* Main Status Grid - Same pattern as ProxmoxWidget */}
      <div className={`grid ${getGridCols()} gap-3 w-full`}>
        {/* Nodes Status Box */}
        {showNodes && (
          <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-1">
              {data.nodes.inactive > 0 && (
                <div className="relative group">
                  <span className="w-2 h-2 bg-red-400 rounded-full inline-block cursor-pointer" />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {data.nodes.inactive} inactive node{data.nodes.inactive !== 1 ? 's' : ''}
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
        )}

        {/* VMs Status Box */}
        {showVMs && (
          <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
              {data.vms.running}/{data.vms.total}
            </div>
            <div className="text-xs text-secondary dark:text-secondaryDark">
              VMs
            </div>
          </div>
        )}

        {/* LXC Status Box */}
        {showLXC && (
          <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
              {data.lxc.running}/{data.lxc.total}
            </div>
            <div className="text-xs text-secondary dark:text-secondaryDark">
              LXC
            </div>
          </div>
        )}
      </div>

      

      {/* Collapsible Detailed View */}
      <div className="bg-tierciarylight dark:bg-darkBg rounded-lg overflow-hidden">
        {/* Toggle Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-main dark:text-mainDark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span>Detailed Information</span>
          <span className={`transform transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Collapsible Content */}
        {showDetails && data.diagnostics && (
          <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-600">
            {/* Pulse System Info */}
            <div className="mb-3 pt-2">
              <h5 className="text-xs font-semibold text-main dark:text-mainDark mb-2">
                Pulse System
              </h5>
              <div className="text-xs text-secondary dark:text-secondaryDark space-y-1">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span className="text-main dark:text-mainDark">{data.diagnostics.version || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="text-main dark:text-mainDark">
                    {data.diagnostics.uptime ? formatUptime(data.diagnostics.uptime) : 'Unknown'}
                  </span>
                </div>
                {data.diagnostics.system && (
                  <>
                    <div className="flex justify-between">
                      <span>Resources:</span>
                      <span className="text-main dark:text-mainDark">
                        {data.diagnostics.system.numCPU} CPU, {data.diagnostics.system.memoryMB}MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span className="text-main dark:text-mainDark">
                        {data.diagnostics.system.os}/{data.diagnostics.system.arch}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Proxmox Connections */}
            {data.diagnostics.connections && data.diagnostics.connections.length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-semibold text-main dark:text-mainDark mb-2">
                  Proxmox Connections
                </h5>
                <div className="space-y-2">
                  {data.diagnostics.connections.map((conn, index) => (
                    <div key={index} className="bg-tierciarylight dark:bg-darkBg rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-main dark:text-mainDark">
                          {conn.name}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          conn.connected ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                      </div>
                      <div className="text-xs text-secondary dark:text-secondaryDark space-y-1">
                        <div>Host: {conn.host}</div>
                        <div>Auth: {conn.authMethod}</div>
                        {conn.version && <div>Version: {conn.version}</div>}
                        {conn.nodeCount && (
                          <div>Cluster: {conn.nodeCount} nodes</div>
                        )}
                        {conn.vmsFound && (
                          <div>VMs: {conn.vmsFound} total{conn.vmsWithAgent && `, ${conn.vmsWithAgent} monitored`}</div>
                        )}
                      </div>
                      
                      {/* Problematic VMs */}
                      {conn.problematicVMs && conn.problematicVMs.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                            Issues ({conn.problematicVMs.length}):
                          </div>
                          {conn.problematicVMs.map((vm, vmIndex) => (
                            <div key={vmIndex} className="text-xs text-secondary dark:text-secondaryDark">
                              • {vm.name}: {vm.issue}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {data.diagnostics.errors && data.diagnostics.errors.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-red-400 mb-2">
                  Errors ({data.diagnostics.errors.length})
                </h5>
                <div className="text-xs text-red-400 space-y-1">
                  {data.diagnostics.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}