import { useState, useEffect } from 'react';
import { ViewState } from '../types';

export const useAppNavigation = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showLiveAgent, setShowLiveAgent] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    if (!window.history.state?.appState) {
        window.history.replaceState({ appState: true, page: 'dashboard', modal: null }, '', '');
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.appState) {
         setView(state.page || 'dashboard');
         setShowSettings(state.modal === 'settings');
         setShowChatHistory(state.modal === 'chatHistory');
         setShowQuotes(state.modal === 'quotes');
         setShowTimer(state.modal === 'timer');
         setIsSidebarOpen(state.modal === 'sidebar');
         setShowPWAInstall(state.modal === 'pwaInstall');
         setShowTrash(state.modal === 'trash');
      } else {
         // Fallback gracefully without instantly closing if state is unknown (e.g. useBackHandler)
         if (!state || !state.modal_id) {
            setView('dashboard');
            setShowSettings(false);
            setShowChatHistory(false);
            setShowQuotes(false);
            setShowTimer(false);
            setIsSidebarOpen(false);
            setShowTrash(false);
         }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openModal = (modalName: string) => {
    if (modalName === 'liveAgent') {
      setShowLiveAgent(true);
      return; 
    }

    const isAnyModalOpen = showSettings || showChatHistory || showQuotes || showTimer || isSidebarOpen || showPWAInstall || showTrash;
    
    // PUSH state to stack BEFORE updating UI. Replace only if switching modals.
    if (isAnyModalOpen) {
       window.history.replaceState({ appState: true, page: view, modal: modalName }, '', '');
    } else {
       window.history.pushState({ appState: true, page: view, modal: modalName }, '', '');
    }

    setShowSettings(modalName === 'settings');
    setShowChatHistory(modalName === 'chatHistory');
    setShowQuotes(modalName === 'quotes');
    setShowTimer(modalName === 'timer');
    setShowTrash(modalName === 'trash');
    setIsSidebarOpen(modalName === 'sidebar');
    setShowPWAInstall(modalName === 'pwaInstall');
  };

  const closeGlobalModal = () => {
    const wasModalOpen = showSettings || showChatHistory || showQuotes || showTimer || isSidebarOpen || showPWAInstall || showTrash;
    if (!wasModalOpen) return;

    setShowSettings(false);
    setShowChatHistory(false);
    setShowQuotes(false);
    setShowTimer(false);
    setShowTrash(false);
    setIsSidebarOpen(false);
    setShowPWAInstall(false);

    // Only back if browser actually has our state
    if (window.history.state?.appState && window.history.state?.modal) {
        window.history.back();
    }
  };

  const navigateTo = (newView: ViewState) => {
    if (newView === view) return;
    
    // When changing main views, we replace or push main state without modals
    setShowSettings(false);
    setShowChatHistory(false);
    setShowQuotes(false);
    setShowTimer(false);
    setShowTrash(false);
    setIsSidebarOpen(false);
    setShowPWAInstall(false);
    
    if (view === 'dashboard') {
      window.history.pushState({ appState: true, page: newView, modal: null }, '', '');
    } else {
      window.history.replaceState({ appState: true, page: newView, modal: null }, '', '');
    }
    
    setView(newView);
  };

  return {
    view, setView,
    isSidebarOpen, setIsSidebarOpen,
    showSettings, setShowSettings,
    showTimer, setShowTimer,
    showPWAInstall, setShowPWAInstall,
    showQuotes, setShowQuotes,
    showChatHistory, setShowChatHistory,
    showLiveAgent, setShowLiveAgent,
    showTrash, setShowTrash,
    openModal,
    closeGlobalModal,
    navigateTo,
    isModalOpen: showSettings || showChatHistory || showQuotes || showTimer || showTrash
  };
};
