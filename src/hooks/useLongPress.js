import { useRef, useCallback } from 'react';

export default function useLongPress(callback, { delay = 500, onStart, onCancel } = {}) {
  const timerRef = useRef(null);
  const activeRef = useRef(false);

  const start = useCallback((e) => {
    e.preventDefault();
    activeRef.current = true;
    onStart?.();
    timerRef.current = setTimeout(() => {
      if (activeRef.current) {
        callback(e);
      }
    }, delay);
  }, [callback, delay, onStart]);

  const cancel = useCallback(() => {
    activeRef.current = false;
    clearTimeout(timerRef.current);
    onCancel?.();
  }, [onCancel]);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onContextMenu: (e) => {
      e.preventDefault();
      callback(e);
    },
  };
}
