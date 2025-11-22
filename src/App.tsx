import React, { useEffect, useRef, useState } from 'react';
import { BackroomsEngine } from './lib/game/BackroomsEngine';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { BootSequence } from './components/BootSequence';
import { cn } from './lib/utils';
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BackroomsEngine | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sanity, setSanity] = useState(100);
  useEffect(() => {
    if (!containerRef.current) return;
    // Initialize Engine
    const engine = new BackroomsEngine(containerRef.current, {
      onLockChange: (locked) => setIsLocked(locked),
      onSanityUpdate: (val) => setSanity(val)
    });
    engine.init();
    engineRef.current = engine;
    // Cleanup
    return () => {
      engine.dispose();
    };
  }, []);
  const handleResume = () => {
    engineRef.current?.lock();
  };
  const handleReset = () => {
    // Reload the page to reset the world for now
    window.location.reload();
  };
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 3D Viewport */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {/* CRT Effects Layer (Pointer events none to allow click-through to canvas) */}
      <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
        <div className="scanlines opacity-10 absolute inset-0 mix-blend-overlay" />
        <div className="vignette absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)]" />
        <div className="noise opacity-[0.03] absolute inset-0" />
      </div>
      {/* Game HUD (Always rendered, visibility toggled by opacity in component) */}
      <GameHUD isLocked={isLocked} sanity={sanity} />
      {/* Pause Menu (Interactive) */}
      {!isLocked && isInitialized && (
        <PauseMenu onResume={handleResume} onReset={handleReset} />
      )}
      {/* Boot Overlay */}
      {!isInitialized && (
        <BootSequence onComplete={() => setIsInitialized(true)} />
      )}
    </div>
  );
}