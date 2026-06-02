import { useState, useRef, useCallback } from 'react';

export function useCardHover(delay = 450) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const timerRef = useRef(null);

  const onEnter = useCallback((index) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setHoveredIndex(index);
    }, delay);
  }, [delay]);

  const onLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 200);
  }, []);

  return { hoveredIndex, onEnter, onLeave };
}
