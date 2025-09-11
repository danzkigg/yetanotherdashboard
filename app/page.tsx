"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import WidgetRenderer from "./components/WidgetRenderer";
import ThemeToggle from "./components/ThemeToggle";
import VersionChecker from './components/VersionChecker';

interface StatusInfo {
  online: boolean;
  statusCode?: number;
  statusText?: string;
}

export default function DashboardPage() {
  const [config, setConfig] = useState<any>(null);
  const [dark, setDark] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, StatusInfo>>({});

  // Fetch dashboard config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        setConfig(data);
      } catch (err) {
        console.error("Failed to fetch config", err);
      }
    };
    fetchConfig();
    const interval = setInterval(fetchConfig, 5000);
    return () => clearInterval(interval);
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Online/offline status
  // Status checking
  useEffect(() => {
  if (!config) return;

  // Only run health checks if enabled
  if (!healthCheckEnabled) {
    setStatusMap({}); // Clear status map if health check is disabled
    return;
  }

  const checkServices = async () => {
    const newStatus: Record<string, StatusInfo> = {};

    // Function to check a single service
    const checkService = async (service: any) => {
      const name = Object.keys(service)[0];
      const details = service[name];
      const { healthUrl } = getServiceUrls(details);

      if (healthUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch('/api/health-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: healthUrl }),
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          
          if (response.ok) {
            const result = await response.json();
            newStatus[healthUrl] = {
              online: result.online,
              statusCode: result.statusCode,
              statusText: result.statusText
            };
          } else {
            newStatus[healthUrl] = {
              online: false,
              statusCode: response.status,
              statusText: "Health Check Failed"
            };
          }
        } catch (error: any) {
          // Handle different error types
          let statusCode = 0;
          let statusText = "Check Failed";
          
          if (error.name === 'AbortError') {
            statusCode = 408;
            statusText = "Timeout";
          }
          
          newStatus[healthUrl] = {
            online: false,
            statusCode,
            statusText
          };
        }
      }
    };

    // Check services
    if (config.services) {
      for (const groupName in config.services) {
        const servicesInGroup = config.services[groupName] || [];
        for (const service of servicesInGroup) {
          await checkService(service);
        }
      }
    }

    // Check bookmarks
    if (config.bookmarks) {
      for (const groupName in config.bookmarks) {
        const bookmarksInGroup = config.bookmarks[groupName] || [];
        for (const bookmark of bookmarksInGroup) {
          await checkService(bookmark);
        }
      }
    }

    setStatusMap(newStatus);
  };

  checkServices();
  const interval = setInterval(checkServices, 10000);
  return () => clearInterval(interval);
}, [config]);

  if (!config) return <p className="text-secondary text-center">Loading...</p>;

  const healthCheckEnabled = config?.settings?.find(
    (s: any) => s.Dashboard
  )?.Dashboard?.["health-check"] !== false; // Default to true if not specified

  const getStatusMessage = (statusInfo: StatusInfo): string => {
    if (!statusInfo) return "Unknown";
    
    if (statusInfo.online) {
      return `OK ${statusInfo.statusCode || 200}`;
    } else {
      const code = statusInfo.statusCode || 0;
      if (code === 0) return `ERR ${statusInfo.statusText || "Network"}`;
      if (code === 408) return "ERR Timeout";
      if (code >= 500) return `ERR ${code}`;
      if (code >= 400) return `ERR ${code}`;
      return `ERR ${code}`;
    }
  };

  // Type for dashboard items
  type DashboardItem = Record<string, {
    icon?: string;
    href?: string;
    url?: string;
    description?: string;
    widgets?: any[];
    group?: string;
  }>;

  // Helper: get bookmarks + services by group
  const getItemsByGroup = (group: string) => {
  const bookmarks: DashboardItem[] = (config.bookmarks?.[group] || []).map((item: any) => {
    const name = Object.keys(item)[0];
    const details = item[name];
    return {
      [name]: {
        ...details,
        group: group,
        type: 'bookmark'  // Mark as bookmark
      }
    };
  });

  const services: DashboardItem[] = (config.services?.[group] || []).map((item: any) => {
    const name = Object.keys(item)[0];
    const details = item[name];
    return {
      [name]: {
        ...details,
        group: group,
        type: 'service'  // Mark as service
      }
    };
  });

  return [...bookmarks, ...services];
};

  const dashboardName = config?.settings?.find(
    (s: any) => s.Dashboard
  )?.Dashboard?.name || "Dashboard";

  // Get dashboard width setting
  const dashboardWidth = config?.settings?.find(
    (s: any) => s.Dashboard
  )?.Dashboard?.width || "wide";

  // Determine container classes based on width setting
  const getContainerClasses = () => {
    switch (dashboardWidth) {
      case "narrow":
        return "max-w-5xl mx-auto";
      case "compact":
        return "max-w-4xl mx-auto";
      case "medium":
        return "max-w-6xl mx-auto";
      case "wide":
      default:
        return "w-full";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-darkBg transition-colors duration-300 pb-6">
      <main className={`flex-grow p-6 ${getContainerClasses()}`}>
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-main dark:text-mainDark">{dashboardName}</h1>
          <ThemeToggle />
        </header>

        {config.layout.map((layoutSection: any, sectionIdx: number) => {
          return renderLayoutSection(layoutSection, sectionIdx, getItemsByGroup, statusMap, healthCheckEnabled, getStatusMessage);
        })}
      </main>

      {/* Footer */}
      <footer className="flex justify-center items-center p-4">
          <VersionChecker />
      </footer>
    </div>
  );
}

// Helper function to get URLs for different purposes
function getServiceUrls(details: any) {
  const href = details.href;
  const url = details.url;
  
  // If both href and url exist, use href for clicking and url for health check
  if (href && url) {
    return {
      clickUrl: href,    // For the <a> tag
      healthUrl: url     // For status checking
    };
  }
  
  // If only one exists, use it for both purposes
  const singleUrl = href || url;
  return {
    clickUrl: singleUrl,
    healthUrl: singleUrl
  };
}

// Render different layout types based on configuration
function renderLayoutSection(
layoutSection: any, sectionIdx: number, getItemsByGroup: (group: string) => any[], statusMap: Record<string, StatusInfo>, healthCheckEnabled: boolean, getStatusMessage: (statusInfo: StatusInfo) => string) {
  // Handle multi-column layout
  if (layoutSection.columns && Array.isArray(layoutSection.columns)) {
    return renderMultiColumnLayout(layoutSection, sectionIdx, getItemsByGroup, statusMap, healthCheckEnabled, getStatusMessage);
  }
  
  // Handle single section layout (existing behavior)
  return renderSingleSectionLayout(layoutSection, sectionIdx, getItemsByGroup, statusMap, healthCheckEnabled, getStatusMessage);
}

// Render multi-column layout with sections side by side
function renderMultiColumnLayout(
  layoutSection: any, 
  sectionIdx: number, 
  getItemsByGroup: (group: string) => any[], 
  statusMap: Record<string, StatusInfo>,
  healthCheckEnabled: boolean,
  getStatusMessage: (statusInfo: StatusInfo) => string
) {
  const { title, columns, gap = 4 } = layoutSection;
  
  return (
    <div key={sectionIdx} className="mb-8">
      {title && (
        <h2 className="text-xl font-semibold text-main dark:text-mainDark mb-6">{title}</h2>
      )}
      
      {/* Use flexbox instead of CSS Grid for better alignment control */}
      <div className="flex flex-col lg:flex-row gap-4">
        {columns.map((column: any, colIdx: number) => (
          <div 
            key={colIdx} 
            className={clsx(
              "flex-1 space-y-6", // Equal width columns that align properly
              "flex flex-col" // Stack sections vertically within each column
            )}
          >
            {column.sections && column.sections.map((section: any, secIdx: number) => {
              const sectionName = Object.keys(section)[0];
              const sectionConfig = section[sectionName];
              
              return (
                <div key={secIdx} className="w-full">
                  {sectionName && (
                    <h3 className="text-lg font-medium text-main dark:text-mainDark mb-4">
                      {sectionName}
                    </h3>
                  )}
                  {renderSectionContent(sectionConfig, getItemsByGroup, statusMap, healthCheckEnabled, getStatusMessage)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Render single section layout
function renderSingleSectionLayout(
  layoutSection: any, 
  sectionIdx: number, 
  getItemsByGroup: (group: string) => any[], 
  statusMap: Record<string, StatusInfo>,
  healthCheckEnabled: boolean,
  getStatusMessage: (statusinfo: StatusInfo) => string
) {
  const tabName = Object.keys(layoutSection)[0];
  const tabConfig = layoutSection[tabName];

  return (
    <section key={sectionIdx} className="mb-8">
      {tabName && (
        <h3 className="text-xl font-semibold text-main dark:text-mainDark mb-4">{tabName}</h3>
      )}

      {tabConfig.groups.map((group: string, groupIdx: number) => {
        return (
          <div key={groupIdx} className="mb-6">
            {renderSectionContent(tabConfig, getItemsByGroup, statusMap, healthCheckEnabled, getStatusMessage, group)}
          </div>
        );
      })}
    </section>
  );
}

// Render the actual content of a section
function renderSectionContent(
  sectionConfig: any, 
  getItemsByGroup: (group: string) => any[], 
  statusMap: Record<string, StatusInfo>,
  healthCheckEnabled: boolean,
  getStatusMessage: (statusInfo: StatusInfo) => string,
  specificGroup?: string
) {
  const groups = specificGroup ? [specificGroup] : sectionConfig.groups || [];
  
  return groups.map((group: string, groupIdx: number) => {
    const itemsToRender = getItemsByGroup(group);
    
    if (itemsToRender.length === 0) return null;

    const bookmarks = itemsToRender.filter(item => {
      const details = Object.values(item)[0] as any;
      return details.type === 'bookmark';
    });
    
    const services = itemsToRender.filter(item => {
      const details = Object.values(item)[0] as any;
      return details.type === 'service';
    });

    return (
      <div key={groupIdx} className="mb-6">
        {services.length > 0 && (
          <div className="mb-4">
            {sectionConfig.style === "grid" ? (
              <div className={clsx(
                "grid gap-4",
                sectionConfig.columns === 1 && "grid-cols-1",
                sectionConfig.columns === 2 && "grid-cols-1 sm:grid-cols-2",
                sectionConfig.columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                sectionConfig.columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
                sectionConfig.columns === 5 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
                sectionConfig.columns === 6 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
              )}>
                {services.map((item, i) => renderServiceCard(item, i, statusMap, healthCheckEnabled, getStatusMessage))}
              </div>
            ) : sectionConfig.style === "row" ? (
              <div className="grid grid-cols-1 gap-4"> 
                {services.map((item, i) => renderServiceCard(item, i, statusMap, healthCheckEnabled, getStatusMessage))}
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto">
                {services.map((item, i) => renderServiceCard(item, i, statusMap, healthCheckEnabled, getStatusMessage))}
              </div>
            )}
          </div>
        )}

        {bookmarks.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-1 gap-3">
              {bookmarks.map((item, i) => renderBookmarkCard(item, i))}
            </div>
          </div>
        )}
      </div>
    );
  });
}

// Render a bookmark
function renderBookmarkCard(bookmark: any, key: number) {
  const name = Object.keys(bookmark)[0];
  const details = bookmark[name];
  const url = details.url || details.href || '';

  const displayUrl = url.replace(/^https?:\/\//, '');

  return (
    <a
      key={key}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-card dark:bg-secondaryBg p-3 rounded-xl shadow hover:shadow-md transition-shadow flex items-center justify-between dark:border dark:border-tierciary group"
    >
      <div className="flex items-center gap-3">
        {details.icon && (
          <span className="text-accent text-xl">
            {renderIcon(details.icon)}
          </span>
        )}
        
        <span className="text-base font-medium text-main dark:text-mainDark group-hover:text-accent dark:group-hover:text-accent transition-colors">
          {name}
        </span>
      </div>
      
      <span className="text-sm text-secondaryDark ml-4 truncate">
        {displayUrl}
      </span>
    </a>
  );
}

// Render a single service/bookmark card (for grid and default layouts)
function renderServiceCard(service: any, key: number, statusMap: Record<string, StatusInfo>, healthCheckEnabled: boolean, getStatusMessage: (statusInfo: StatusInfo) => string) {
  const name = Object.keys(service)[0];
  const details = service[name];
  const { clickUrl, healthUrl } = getServiceUrls(details);

  return (
    <div
      key={key}
      className="bg-card dark:bg-secondaryBg p-4 rounded-2xl shadow hover:shadow-lg transition-shadow flex flex-col gap-3 dark:border dark:border-tierciary"
    >
      <div className="flex items-center gap-3">
        {details.icon && (
          <span className="text-accent text-3xl">
            {renderIcon(details.icon)}
          </span>
        )}

        <div className="flex flex-col justify-center">
          {clickUrl ? (
            <a
              href={clickUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-main dark:text-mainDark"
            >
              {name}
            </a>
          ) : (
            <span className="text-lg font-semibold text-main dark:text-mainDark">{name}</span>
          )}

          {details.description && (
            <span className="text-sm text-secondaryDark">
              {details.description}
            </span>
          )}
        </div>

        {/* Only show status indicator if health check is enabled and healthUrl exists */}
        {healthCheckEnabled && healthUrl && (
          <span
            className="ml-auto w-4 h-4 flex items-center justify-center rounded-full"
            title={getStatusMessage(statusMap[healthUrl])}
          >
            {statusMap[healthUrl]?.online ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 text-accent"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg 
                className="w-6 h-6 text-red-400"
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
            )}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-3">
        {details.widgets?.map((w: any, idx: number) => (
          <WidgetRenderer key={idx} widget={w} serviceName={name} />
        ))}
      </div>
    </div>
  );
}

// Render a single service/bookmark card for row layout
function renderServiceCardRow(service: any, key: number, statusMap: Record<string, StatusInfo>, healthCheckEnabled: boolean, getStatusMessage: (statusInfo: StatusInfo) => string) {
  const name = Object.keys(service)[0];
  const details = service[name];

  return (
    <div
      key={key}
      className="bg-card dark:bg-secondaryBg p-4 rounded-2xl shadow hover:shadow-lg transition-shadow dark:border dark:border-tierciary relative"
    >
      {/* Status indicator - top right corner */}
      <span
        className="absolute top-3 right-3 w-4 h-4 flex items-center justify-center rounded-full"
        title={getStatusMessage(statusMap[details.url])}
      >
        {statusMap[details.url]?.online ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-accent"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <span className="w-4 h-4 text-red-400 font-bold text-sm flex items-center justify-center">✕</span>
        )}
      </span>

      {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pr-6">
        
        {/* Top section (mobile) / Left side (desktop): Icon, Name, Description */}
        <div className="flex items-center gap-3">
          {details.icon && (
            <span className="text-accent text-3xl">
              {renderIcon(details.icon)}
            </span>
          )}

          <div className="flex flex-col justify-center">
            {details.url ? (
              <a
                href={details.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-main dark:text-mainDark"
              >
                {name}
              </a>
            ) : (
              <span className="text-lg font-semibold text-main dark:text-mainDark">
                {name}
              </span>
            )}

            {details.description && (
              <span className="text-sm text-secondaryDark">
                {details.description}
              </span>
            )}
          </div>
        </div>

        {/* Bottom section (mobile) / Right side (desktop): Widgets */}
        {details.widgets && details.widgets.length > 0 && (
          <div className="w-full sm:flex-1 -mx-4 px-4 sm:mx-0"> {/* Extend to card edges on mobile */}
            {details.widgets.map((w: any, idx: number) => (
              <WidgetRenderer key={idx} widget={w} serviceName={name} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderIcon(icon: string) {
  if (!icon) return <span className="text-3xl text-main dark:text-mainDark">?</span>;
  
  const iconSize = "w-8 h-8";
  const colorClasses = "text-main dark:text-mainDark";
  const commonClasses = `inline-block ${iconSize} ${colorClasses}`;
  
  const [prefix, name] = icon.split(":");
  
  switch (prefix) {
    case "mdi":
      return <i className={`mdi mdi-${name} ${commonClasses} text-3xl`}></i>;
    
    case "si":
      return (
        <div className={`${iconSize} relative`}>
          <img 
            src={`https://simpleicons.org/icons/${name}.svg`} 
            alt={name} 
            className="w-full h-full opacity-0 absolute"
          />
          <div 
            className={`w-full h-full ${colorClasses}`}
            style={{
              maskImage: `url(https://simpleicons.org/icons/${name}.svg)`,
              WebkitMaskImage: `url(https://simpleicons.org/icons/${name}.svg)`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
              backgroundColor: 'currentColor'
            }}
          />
        </div>
      );
    
    case "sh":
      return (
        <div className={`${iconSize} relative`}>
          <img 
            src={`https://selfh.st/icons/${name}.svg`} 
            alt={name} 
            className="w-full h-full opacity-0 absolute"
          />
          <div 
            className={`w-full h-full ${colorClasses}`}
            style={{
              maskImage: `url(https://selfh.st/icons/${name}.svg)`,
              WebkitMaskImage: `url(https://selfh.st/icons/${name}.svg)`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
              backgroundColor: 'currentColor'
            }}
          />
        </div>
      );
    
    case "di":
      return (
        <img 
          src={`https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/${name}.svg`} 
          alt={name} 
          className={`${iconSize}`}
        />
      );
    
    default:
      return <span className={`${commonClasses} text-3xl`}>📦</span>;
  }
}