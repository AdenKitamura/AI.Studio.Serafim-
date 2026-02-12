
import React, { useEffect, useRef } from 'react';

const BackgroundGlow = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateMousePosition = (x: number, y: number) => {
      container.style.setProperty('--mouse-x', `${x}px`);
      container.style.setProperty('--mouse-y', `${y}px`);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateMousePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    // Set initial position to center
    updateMousePosition(window.innerWidth / 2, window.innerHeight / 2);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      {/* Base Dots Pattern */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(var(--border-color) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          opacity: 0.4,
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 40%, transparent 100%)'
        }}
      />
      
      {/* Spotlight Glow */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(
            600px circle at var(--mouse-x) var(--mouse-y), 
            var(--accent-glow), 
            transparent 40%
          )`,
          opacity: 0.4,
        }}
      />
      
      {/* Secondary Ambient Glow (optional, keeps center lit) */}
      <div 
         className="absolute inset-0"
         style={{
            background: `radial-gradient(
                800px circle at 50% 50%,
                var(--accent-glow),
                transparent 60%
            )`,
            opacity: 0.05
         }}
      />
    </div>
  );
};

export default BackgroundGlow;
