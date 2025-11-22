import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BackroomsEngine, WorldType } from './lib/game/BackroomsEngine';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { BootSequence } from './components/BootSequence';
import { StartOverlay } from './components/StartOverlay';
import { DeathScreen } from './components/DeathScreen';
import { cn } from './lib/utils';
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BackroomsEngine | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDead, setIsDead] = useState(false);
  // Game Stats
  const [sanity, setSanity] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [fps, setFps] = useState(60);
  const [proximity, setProximity] = useState(0);
  const [level, setLevel] = useState<WorldType>(WorldType.BACKROOMS);
  // Settings
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [mouseSensitivity, setMouseSensitivity] = useState(1.0);
  // Load Settings on Mount
  useEffect(() => {
    const savedQuality = localStorage.getItem('quality') as 'high' | 'low' || 'high';
    const savedSens = Number(localStorage.getItem('sensitivity')) || 1.0;
    const savedVol = Number(localStorage.getItem('masterVolume')) || 0.8;
    const savedLevel = localStorage.getItem('level') as WorldType || WorldType.BACKROOMS;
    setQuality(savedQuality);
    setMouseSensitivity(savedSens);
    setVolume(savedVol * 100);
    setLevel(savedLevel);
    if (engineRef.current) {
      engineRef.current.setSensitivity(savedSens);
      engineRef.current.setVolume(savedVol);
      engineRef.current.setLevel(savedLevel);
    }
  }, []);
  // Persist Settings
  useEffect(() => { localStorage.setItem('quality', quality); }, [quality]);
  useEffect(() => { localStorage.setItem('sensitivity', mouseSensitivity.toString()); }, [mouseSensitivity]);
  useEffect(() => { localStorage.setItem('masterVolume', (volume / 100).toString()); }, [volume]);
  useEffect(() => { localStorage.setItem('level', level); }, [level]);
  // Resize Observer for Container (Optional dynamic scaling)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // We could adjust state here if needed, but CSS/Tailwind handles most responsiveness.
      // This ensures we catch container resize events even if window doesn't change (e.g. mobile toolbar)
      engineRef.current?.onWindowResize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  // Audio Resume on Visibility/Interaction
  useEffect(() => {
    const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
            engineRef.current?.resumeAudio();
        }
    };
    const handleClick = () => engineRef.current?.resumeAudio();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('click', handleClick, { once: true });
    window.addEventListener('touchstart', handleClick, { once: true });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleClick);
    };
  }, []);
  // Callbacks memoized to prevent unnecessary engine updates (though engine handles params in constructor)
  // These are primarily for the engine to call BACK to React
  const handleLockChange = useCallback((locked: boolean) => setIsLocked(locked), []);
  const handleSanityUpdate = useCallback((val: number) => setSanity(val), []);
  const handleStaminaUpdate = useCallback((val: number) => setStamina(val), []);
  const handleProximityUpdate = useCallback((val: number) => setProximity(val), []);
  const handleFPSUpdate = useCallback((val: number) => setFps(val), []);
  const handleQualityChange = useCallback((val: 'high' | 'low') => setQuality(val), []);
  const handleVolumeChange = useCallback((vol: number) => setVolume(vol * 100), []);
  const handleMute = useCallback(() => setIsMuted(prev => !prev), []);
  const handleDeath = useCallback(() => setIsDead(true), []);
  const handleSensitivityChange = useCallback((sens: number) => {
    setMouseSensitivity(sens);
    localStorage.setItem('sensitivity', sens.toString());
  }, []);
  const handleLevelChange = useCallback((l: WorldType) => setLevel(l), []);
  useEffect(() => {
    if (!containerRef.current) return;
    // Initialize Engine
    const engine = new BackroomsEngine(containerRef.current, {
      onLockChange: handleLockChange,
      onSanityUpdate: handleSanityUpdate,
      onStaminaUpdate: handleStaminaUpdate,
      onProximityUpdate: handleProximityUpdate,
      onFPSUpdate: handleFPSUpdate,
      onQualityChange: handleQualityChange,
      onVolumeChange: handleVolumeChange,
      onMute: handleMute,
      onDeath: handleDeath,
      onSensitivityChange: handleSensitivityChange,
      onLevelChange: handleLevelChange
    });
    engine.init();
    engineRef.current = engine;
    // Apply initial settings
    const savedSens = Number(localStorage.getItem('sensitivity')) || 1.0;
    const savedVol = Number(localStorage.getItem('masterVolume')) || 0.8;
    const savedLevel = localStorage.getItem('level') as WorldType || WorldType.BACKROOMS;
    engine.setSensitivity(savedSens);
    engine.setVolume(savedVol);
    engine.setLevel(savedLevel);
    // Cleanup
    return () => {
      engine.dispose();
    };
  }, [
    handleLockChange, handleSanityUpdate, handleStaminaUpdate, handleProximityUpdate, 
    handleFPSUpdate, handleQualityChange, handleVolumeChange, handleMute, 
    handleDeath, handleSensitivityChange, handleLevelChange
  ]);
  const handleStart = () => {
    if (isDead) setIsDead(false);
    engineRef.current?.lock();
    setHasStarted(true);
  };
  const handleResume = () => {
    engineRef.current?.lock();
    setHasStarted(true);
  };
  const handleReset = () => {
    window.location.reload();
  };
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black max-w-none">
      {/* 3D Viewport */}
      <div ref={containerRef} className="absolute inset-0 z-0 w-full h-full" />
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
      <div className={cn("absolute inset-0 z-40", (!isLocked || isDead) && "pointer-events-none")}>
        <GameHUD
          isLocked={isLocked}
          sanity={sanity}
          stamina={stamina}
          quality={quality}
          fps={fps}
          proximity={proximity}
          level={level}
        />
      </div>
      {/* Overlays Logic */}
      {isDead ? (
        <DeathScreen
          onRetry={() => {
            engineRef.current?.reset();
            setIsDead(false);
            setSanity(100);
            setStamina(100);
            setProximity(0);
          }}
          onMenu={() => {
            setIsDead(false);
            engineRef.current?.unlock();
            setHasStarted(false);
          }}
        />
      ) : !isInitialized ? (
        <BootSequence onComplete={() => {
          setIsInitialized(true);
          engineRef.current?.setLevel(level);
        }} />
      ) : !isLocked && !hasStarted ? (
        <StartOverlay onStart={handleStart} />
      ) : !isLocked ? (
        <PauseMenu
          onResume={handleResume}
          onReset={handleReset}
          volume={volume}
          isMuted={isMuted}
          quality={quality}
          mouseSensitivity={mouseSensitivity}
          level={level}
          onVolumeChange={(val) => {
            setVolume(val);
            engineRef.current?.setVolume(val / 100);
          }}
          onMute={() => {
            setIsMuted(!isMuted);
            engineRef.current?.toggleMute();
          }}
          onQualityToggle={() => engineRef.current?.toggleQuality()}
          onSensitivityChange={(sens) => {
            setMouseSensitivity(sens);
            engineRef.current?.setSensitivity(sens);
          }}
          onLevelChange={(l) => {
            setLevel(l);
            engineRef.current?.setLevel(l);
            localStorage.setItem('level', l);
          }}
        />
      ) : null}
    </div>
  );
}