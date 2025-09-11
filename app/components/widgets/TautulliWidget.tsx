"use client";
import { useEffect, useState } from "react";
import { WidgetError, useWidgetError } from "./WidgetError";
import { WidgetLoading } from "./WidgetLoading"; 

interface Session {
  user: string;
  title: string;
  type: string;
  view_offset?: number;
  duration?: number;
  state?: string;
  friendly_name?: string;
  poster?: string;
}

interface TautulliWidgetProps {
  serviceName: string;
  config: {
    refreshInterval?: number;
    [key: string]: any;
  };
}

function formatTime(seconds?: number) {
  if (!seconds || isNaN(seconds)) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TautulliWidget({ serviceName, config }: TautulliWidgetProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { error, handleError, clearError } = useWidgetError();

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  useEffect(() => {
    const fetchData = async () => {
      try {
        clearError();
        
        const res = await fetch(`/api/widget/tautulli/${serviceName}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch Tautulli data`);
        }
        
        const data = await res.json();
        const newSessions = data.sessions || [];
        
        // Only reset index if the number of sessions changed significantly
        // or if current index is out of bounds
        if (newSessions.length === 0 || currentIndex >= newSessions.length) {
          setCurrentIndex(0);
        }
        
        setSessions(newSessions);
        setLoading(false);
      } catch (err) {
        handleError(err, 'Tautulli');
        setSessions([]);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, config?.refreshInterval || 5000);
    return () => clearInterval(interval);
  }, [serviceName, config, currentIndex]); // Added currentIndex to dependencies

  // Navigation functions
  const nextSession = () => {
    setCurrentIndex((prev) => (prev + 1) % sessions.length);
  };

  const prevSession = () => {
    setCurrentIndex((prev) => (prev - 1 + sessions.length) % sessions.length);
  };

  const goToSession = (index: number) => {
    setCurrentIndex(index);
  };

  // Touch event handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // Reset touchEnd
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (sessions.length > 1) {
      if (isLeftSwipe) {
        nextSession();
      }
      if (isRightSwipe) {
        prevSession();
      }
    }
  };

  // Loading state
  if (loading) {
    return <WidgetLoading message="Loading streams..." />;
  }

  // Error state
  if (error) {
    return (
      <WidgetError 
        title="Tautulli" 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // No sessions state
  if (!sessions.length) {
    return <p className="text-secondaryDark text-center text-sm">No active streams</p>;
  }

  const currentSession = sessions[currentIndex];
  const percent = currentSession.view_offset && currentSession.duration 
    ? Math.min((currentSession.view_offset / currentSession.duration) * 100, 100) 
    : 0;
  const subtitle = currentSession.type === "movie" ? currentSession.friendly_name : currentSession.friendly_name || "";

  // Success state with carousel
  return (
    <div className="relative">
      {/* Main session card with touch handlers */}
      <div 
        className="flex gap-4 items-center bg-tierciarylight dark:bg-darkBg p-3 rounded-2xl touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex-shrink-0 w-16 h-24 rounded overflow-hidden">
          <img 
            src={currentSession.poster || "/placeholder.png"} 
            alt="Poster" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.png";
            }}
          />
        </div>

        <div className="flex flex-col flex-grow gap-1">
          <div className="flex justify-between items-center">
            <div className="truncate font-semibold text-main dark:text-mainDark">{currentSession.title}</div>
            <div className="text-sm text-secondary dark:text-secondaryDark">
              {formatTime(currentSession.view_offset)} / {formatTime(currentSession.duration)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              {currentSession.state === "playing" ? (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-3 h-3"
                >
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              ) : currentSession.state === "paused" ? (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-3 h-3"
                >
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-3 h-3"
                >
                  <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.243.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="bg-secondary dark:bg-tierciary rounded h-1 w-full overflow-hidden">
              <div className="bg-accent h-full rounded" style={{ width: `${percent}%` }}></div>
            </div>
          </div>

          {subtitle && <div className="text-sm text-secondary dark:text-secondaryDark truncate">{subtitle}</div>}
          
        </div>
      </div>

      {/* Dot indicators - only show if multiple sessions */}
      {sessions.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {sessions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSession(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex 
                  ? 'bg-accent' 
                  : 'bg-secondary dark:bg-tierciary hover:bg-accent/50'
              }`}
              aria-label={`Go to session ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}