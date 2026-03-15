import { useEffect, useRef } from 'react';

export function useBackHandler(isActive: boolean, onBack: () => void) {
  const isBackingRef = useRef(false);
  const idRef = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    if (isActive) {
      const id = idRef.current;
      window.history.pushState({ modal: true, id }, '', '');
      
      const handlePopState = (e: PopStateEvent) => {
        if (e.state?.id !== id) {
          isBackingRef.current = true;
          onBack();
        }
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (!isBackingRef.current && window.history.state?.id === id) {
          // Closed programmatically, pop the state
          window.history.back();
        }
        isBackingRef.current = false;
      };
    }
  }, [isActive, onBack]);
}
