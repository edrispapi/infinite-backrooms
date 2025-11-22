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
  // Settings
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => {
    if (!containerRef.current) return;
    // Initialize Engine
    const engine = new BackroomsEngine(containerRef.current, {
      onLockChange: (locked) => setIsLocked(locked),
      onSanityUpdate: (val) => setSanity(val),
      onStaminaUpdate: (val) => setStamina(val),
      onProximityUpdate: (val) => setProximity(val),
      onFPSUpdate: (val) => setFps(val),
      onQualityChange: (val) => setQuality(val),
      onVolumeChange: (vol) => setVolume(vol * 100), // Engine emits 0-1, UI uses 0-100
      onMute: () => setIsMuted(prev => !prev)
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
        {/* Pulsing Vignette for Atmosphere */}
        <motion.div 
          className="absolute inset-0 z-20 pointer-events-none bg-black/20 rounded-full"
          animate={{ scale: [1, 1.01, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      {/* Game HUD */}
      <div className={cn("absolute inset-0 z-40", !isLocked && "pointer-events-none")}>
        <GameHUD
          isLocked={isLocked}
          sanity={sanity}
          stamina={stamina}
          quality={quality}
          fps={fps}
          proximity={proximity}
        />
      </div>
      {/* Overlays Logic */}
      {!isInitialized ? (
        <BootSequence onComplete={() => setIsInitialized(true)} />
      ) : !isLocked && !hasStarted ? (
        <StartOverlay onStart={handleStart} />
      ) : !isLocked ? (
        <PauseMenu 
          onResume={handleResume} 
          onReset={handleReset}
          volume={volume}
          isMuted={isMuted}
          quality={quality}
          onVolumeChange={(val) => {
            setVolume(val);
            engineRef.current?.setVolume(val / 100);
          }}
          onMute={() => {
            setIsMuted(!isMuted);
            engineRef.current?.toggleMute();
          }}
          onQualityToggle={() => engineRef.current?.toggleQuality()}
        />
      ) : null}
    </div>
  );
}