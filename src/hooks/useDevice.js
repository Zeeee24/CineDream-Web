import { useState, useEffect } from 'react';

export function useDevice() {
  const [device, setDevice] = useState({
    isTV: false,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function detect() {
      const ua = navigator.userAgent || '';
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      const isAndroidTV = /Android.*TV|SmartTV|Smart TV|GoogleTV|TV Map|Nexxbox|NetCast|Vizio/i.test(ua);
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const isWideScreen = w >= 1200;

      const isTV = isAndroidTV || (isWideScreen && isCoarsePointer && !isTouch);
      const isMobile = w < 768;
      const isTablet = (w >= 768 && w < 1024) || (isTouch && isCoarsePointer && w >= 768 && w < 1200);
      const isDesktop = !isTV && !isMobile && !isTablet;

      setDevice({ isTV, isMobile, isTablet, isDesktop, isTouch, width: w, height: h });
    }

    detect();
    window.addEventListener('resize', detect);
    window.addEventListener('orientationchange', detect);
    return () => {
      window.removeEventListener('resize', detect);
      window.removeEventListener('orientationchange', detect);
    };
  }, []);

  return device;
}
