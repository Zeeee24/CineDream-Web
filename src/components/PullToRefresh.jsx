import { useState, useRef, useCallback, useEffect } from 'react';
import { useDevice } from '../hooks/useDevice';

export default function PullToRefresh({ children, onRefresh }) {
  const { isMobile } = useDevice();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startY = useRef(0);
  const successTimerRef = useRef(null);
  const THRESHOLD = 80;

  useEffect(() => {
    return () => clearTimeout(successTimerRef.current);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY > 0 || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPulling(true);
      const resistance = 1 - diff / 600;
      setPullY(Math.min(diff * resistance, 120));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullY >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
        clearTimeout(successTimerRef.current);
        setSuccess(true);
        successTimerRef.current = setTimeout(() => setSuccess(false), 1200);
      } catch {
        /* ignore */
      }
      setRefreshing(false);
    }
    setPulling(false);
    setPullY(0);
  }, [pulling, pullY, onRefresh]);

  if (!isMobile) return children;

  return (
    <div
      className="pull-refresh-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehavior: 'contain' }}
    >
      {(pulling || refreshing || success) && (
        <div
          className="pull-indicator"
          style={{
            height: refreshing || success ? 48 : Math.min(pullY * 0.5, 48),
            opacity: 1,
          }}
        >
          {success ? (
            <div className="pull-success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          ) : (
            <>
              <div className={`pull-spinner ${refreshing ? 'active' : ''}`} />
              {!refreshing && pullY < THRESHOLD && (
                <span className="pull-text">Pull down to refresh</span>
              )}
              {!refreshing && pullY >= THRESHOLD && (
                <span className="pull-text">Release to refresh</span>
              )}
              {refreshing && (
                <span className="pull-text">Refreshing...</span>
              )}
            </>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
