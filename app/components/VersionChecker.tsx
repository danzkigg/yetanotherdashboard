import { useState, useEffect } from 'react';

interface VersionInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  updateAvailable: boolean;
  error?: string;
}

// Warning icon component
const WarningIcon = ({ className = "", title }: { className?: string; title?: string }) => (
  <span title={title} className="inline-block">
    <svg 
      className={className}
      fill="currentColor" 
      viewBox="0 0 20 20" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fillRule="evenodd" 
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
        clipRule="evenodd" 
      />
    </svg>
  </span>
);

export default function VersionChecker() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version');
        const data: VersionInfo = await response.json();
        setVersionInfo(data);
      } catch (error) {
        console.error('Failed to check version:', error);
        setVersionInfo({
          current: '1.0.0',
          latest: null,
          hasUpdate: false,
          updateAvailable: false,
          error: 'Failed to check for updates'
        });
      } finally {
        setLoading(false);
      }
    };

    checkVersion();
    // Check for updates every hour
    const interval = setInterval(checkVersion, 3600000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !versionInfo) {
    return <span className="text-sm text-gray-500">YAD vx.x.x</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-center text-sm text-secondaryDark">
        YAD v{versionInfo.current}
      </span>
      {versionInfo.hasUpdate && versionInfo.latest && (
        <span className="text-xs bg-accent text-main px-2 py-1 rounded-full">
          <a href={`https://github.com/danzkigg/yad/releases/tag/${versionInfo.latest}`} target="_blank" rel="noopener noreferrer">
          <WarningIcon className="w-4 h-4 inline-block ml-1 text-yellow-400" /> {versionInfo.latest} available
          </a>
        </span>
      )}
      {versionInfo.error && (
        <WarningIcon 
          className="w-4 h-4 text-gray-400" 
          title={versionInfo.error}
        />
      )}
    </div>
  );
}