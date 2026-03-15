import { useEffect, useRef } from 'react';

export function useBackHandler(isActive: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  const idRef = useRef(Math.random().toString(36).substring(7));

  // Always keep the latest callback without triggering the effect
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isActive) return;

    const id = idRef.current;
    window.history.pushState({ modal: true, id }, '', '');

    let isPoppedByBrowser = false;

    const handlePopState = (e: PopStateEvent) => {
      // If the state ID doesn't match, it means we went back past this modal's state
      if (e.state?.id !== id) {
        isPoppedByBrowser = true;
        onBackRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If the modal was closed programmatically (not by the browser back button),
      // we need to remove its state from the history stack.
      if (!isPoppedByBrowser && window.history.state?.id === id) {
        window.history.back();
      }
    };
  }, [isActive]); // Removed onBack from dependencies to prevent infinite loops
}
