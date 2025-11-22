import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BackroomsEngine } from './lib/game/BackroomsEngine';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { BootSequence } from './components/BootSequence';
import { StartOverlay } from './components/StartOverlay';
import { cn } from './lib/utils';
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BackroomsEngine | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  // Game Stats
  const [sanity, setSanity] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [fps, setFps] = useState(60);
  const [proximity, setProximity] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    // Initialize Engine
    const engine = new BackroomsEngine(containerRef.current, {
      onLockChange: (locked) => setIsLocked(locked),
      onSanityUpdate: (val) => setSanity(val),
      onStaminaUpdate: (val) => setStamina(val),
      onProximityUpdate: (val) => setProximity(val),
      onFPSUpdate: (val) => setFps(val),
      onQualityChange: (val) => setQuality(val)
    });
    engine.init();
    engineRef.current = engine;
    // Cleanup
    return () => {
      engine.dispose();
    };
  }, []);
  const handleStart = () => {
    engineRef.current?.lock();
    setHasStarted(true);
  };
  const handleResume = () => {
    engineRef.current?.lock();
    setHasStarted(true);
  };
  const handleReset = () => {
    // Reload the page to reset the world for now
    window.location.reload();
  };
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black max-w-none">
      {/* 3D Viewport */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {/* CRT Effects Layer */}
      <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
        <div className="scanlines opacity-10 absolute inset-0 mix-blend-overlay" />
        <div className="vignette absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)]" />
        <div className="noise opacity-[0.03] absolute inset-0" />
        {/* Subtle CRT Flicker */}
        <motion.div 
          className="absolute inset-0 z-10 pointer-events-none bg-white mix-blend-overlay" 
          animate={{ opacity: [0.02, 0.05, 0.02] }} 
          transition={{ duration: 2, repeat: Infinity }} 
        />
      </div>
      {/* Game HUD */}
      <GameHUD 
        isLocked={isLocked} 
        sanity={sanity} 
        stamina={stamina}
        quality={quality}
        fps={fps}
        proximity={proximity}
      />
      {/* Overlays Logic */}
      {!isInitialized ? (
        <BootSequence onComplete={() => setIsInitialized(true)} />
      ) : !isLocked && !hasStarted ? (
        <StartOverlay onStart={handleStart} />
      ) : !isLocked ? (
        <PauseMenu onResume={handleResume} onReset={handleReset} />
      ) : null}
    </div>
  );
}