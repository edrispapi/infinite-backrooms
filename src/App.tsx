import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BackroomsEngine } from './lib/game/BackroomsEngine';
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
  // Settings
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [mouseSensitivity, setMouseSensitivity] = useState(1.0);
  // Load Settings on Mount
  useEffect(() => {
    const savedQuality = localStorage.getItem('quality') as 'high' | 'low' || 'high';
    const savedSens = Number(localStorage.getItem('sensitivity')) || 1.0;
    const savedVol = Number(localStorage.getItem('masterVolume')) || 0.8;
    setQuality(savedQuality);
    setMouseSensitivity(savedSens);
    setVolume(savedVol * 100);
    if (engineRef.current) {
      engineRef.current.setSensitivity(savedSens);
      engineRef.current.setVolume(savedVol);
    }
  }, []);
  // Persist Settings
  useEffect(() => { localStorage.setItem('quality', quality); }, [quality]);
  useEffect(() => { localStorage.setItem('sensitivity', mouseSensitivity.toString()); }, [mouseSensitivity]);
  useEffect(() => { localStorage.setItem('masterVolume', (volume / 100).toString()); }, [volume]);
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
      onVolumeChange: (vol) => setVolume(vol * 100),
      onMute: () => setIsMuted(prev => !prev),
      onDeath: () => setIsDead(true),
      onSensitivityChange: (sens) => {
        setMouseSensitivity(sens);
        localStorage.setItem('sensitivity', sens.toString());
      }
    });
    engine.init();
    engineRef.current = engine;
    // Apply initial settings
    const savedSens = Number(localStorage.getItem('sensitivity')) || 1.0;
    const savedVol = Number(localStorage.getItem('masterVolume')) || 0.8;
    engine.setSensitivity(savedSens);
    engine.setVolume(savedVol);
    // Cleanup
    return () => {
      engine.dispose();
    };
  }, []);
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
      <div className={cn("absolute inset-0 z-40", (!isLocked || isDead) && "pointer-events-none")}>
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
          mouseSensitivity={mouseSensitivity}
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
        />
      ) : null}
    </div>
  );
}