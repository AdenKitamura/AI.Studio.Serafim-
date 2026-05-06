import { useEffect, useRef } from 'react';

export function useBackHandler(isActive: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  const idRef = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isActive) return;

    const id = idRef.current;
    // Push a discrete internal view state to history
    window.history.pushState({ internal_modal: true, modal_id: id }, '', '');

    let isPoppedByBrowser = false;

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.modal_id !== id) {
        isPoppedByBrowser = true;
        onBackRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Remove cleanly if it wasn't the browser back button
      if (!isPoppedByBrowser && window.history.state?.modal_id === id) {
        window.history.back();
      }
    };
  }, [isActive]);
}
