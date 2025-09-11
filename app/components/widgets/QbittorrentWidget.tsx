import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface QbittorrentWidgetProps {
  serviceName: string;
  config: {
    url?: string;
    username?: string;
    password?: string;
    refreshInterval?: number;
    [key: string]: any;
  };
}

interface QbittorrentData {
  downloadSpeed: string;
  uploadSpeed: string;
  seedingCount: number;
  downloadingCount: number;
  totalTorrents: number;
  connectionStatus: string;
  status: string;
}

export default function QbittorrentWidget({ serviceName, config }: QbittorrentWidgetProps) {
  const [data, setData] = useState<QbittorrentData>({ 
    downloadSpeed: '0.0', 
    uploadSpeed: '0.0',
    seedingCount: 0, 
    downloadingCount: 0,
    totalTorrents: 0,
    connectionStatus: 'disconnected',
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useWidgetError();

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const response = await fetch(`/api/widget/qbittorrent/${serviceName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch qBittorrent data`);
        }
        
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        handleError(err, 'qBittorrent');
        setLoading(false);
      }
    };

    fetchData();
    
    const refreshInterval = config.refreshInterval || 5000; // Default 5 seconds for torrent client
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [serviceName, config.refreshInterval]);

  // Loading state
  if (loading) {
    return <WidgetLoading type="skeleton" message="Loading torrents..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="qBittorrent" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Success state
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {/* Download Speed Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.downloadSpeed}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          MB/s
        </div>
      </div>

      {/* Seeding Torrents Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.seedingCount}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Seeding
        </div>
      </div>

      {/* Downloading Torrents Box */}
      <div className="bg-tierciarylight dark:bg-darkBg p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="text-sm font-bold text-main dark:text-mainDark mb-1">
          {data.downloadingCount}
        </div>
        <div className="text-xs text-secondary dark:text-secondaryDark">
          Leeching
        </div>
      </div>
    </div>
  );
}