import { useState, useRef, useCallback } from 'react';
import { useDevice } from '../hooks/useDevice';

export default function PullToRefresh({ children, onRefresh }) {
  const { isMobile } = useDevice();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef(null);
  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY > 0 || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && diff < 200) {
      setPulling(true);
      setPullY(diff);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullY >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
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
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pulling || refreshing) && (
        <div
          className="pull-indicator"
          style={{
            height: refreshing ? 48 : Math.min(pullY * 0.5, 48),
            opacity: 1,
          }}
        >
          <div className={`pull-spinner ${refreshing ? 'active' : ''}`} />
          {!refreshing && pullY >= THRESHOLD && (
            <span className="pull-text">Release to refresh</span>
          )}
          {refreshing && (
            <span className="pull-text">Refreshing...</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
