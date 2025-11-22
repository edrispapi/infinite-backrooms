import React, { useEffect, useState } from 'react';
import { Battery, Disc3, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { WorldType } from '@/lib/game/BackroomsEngine';
interface GameHUDProps {
  isLocked: boolean;
  sanity: number;
  stamina: number;
  quality: 'high' | 'low';
  fps?: number;
  proximity: number;
  level: WorldType;
}
export function GameHUD({ isLocked, sanity, stamina, quality, fps, proximity, level }: GameHUDProps) {
  // Simulating a diegetic camcorder interface
  const [timeString, setTimeString] = useState("00:00:00 PM");
  const [localFPS, setLocalFPS] = useState(60);
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        // Retro format
        setTimeString(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (fps !== undefined) setLocalFPS(fps);
  }, [fps]);
  return (
    <>
      {/* Danger Overlay */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-200 pointer-events-none z-30 mix-blend-multiply",
          proximity > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{
          opacity: proximity,
          background: 'radial-gradient(circle, rgba(139,0,0,0.4) 0%, rgba(50,0,0,0) 80%)'
        }}
      />
      <div className={cn(
        "absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-8 sm:p-12 font-mono select-none text-br-text transition-opacity duration-500",
        !isLocked ? "opacity-40 blur-sm" : "opacity-100 blur-none"
      )}>
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-600 animate-blink shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
              <span className="text-xl sm:text-2xl tracking-widest font-bold drop-shadow-md">REC</span>
              {/* Level Indicator */}
              <div className="flex items-center gap-2 text-sm font-bold tracking-widest opacity-80 ml-4 border-l border-white/20 pl-4">
                 <span className={level === WorldType.HILL ? 'text-blue-400' : 'text-yellow-400'}>LEVEL:</span>
                 <span>{level.toUpperCase()}</span>
              </div>
            </div>
            <div className="text-sm opacity-70 tracking-wider">TAPE_004 // [LIVE_FEED]</div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
             <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold drop-shadow-md">
               <Battery className="w-6 h-6 sm:w-8 sm:h-8 fill-white/20" />
               <span>84%</span>
             </div>
             {/* Quality Indicator */}
             <div className={cn(
               "text-sm font-bold tracking-widest transition-colors",
               quality === 'low' && "text-yellow-400 animate-pulse"
             )}>
               QUALITY: {quality.toUpperCase()}
             </div>
             {/* Sanity Meter */}
             <div className="flex flex-col items-end gap-1 w-48 mt-2">
               <div className="flex items-center gap-2 text-sm font-bold tracking-widest">
                  <Brain className={cn("w-4 h-4", sanity < 30 && "animate-pulse text-red-500")} />
                  <span className={cn(sanity < 30 && "text-red-500")}>SANITY: {Math.floor(sanity)}%</span>
               </div>
               <Slider
                  value={[sanity]}
                  max={100}
                  step={1}
                  className="w-full"
                  disabled
               />
             </div>
             {/* Stamina Meter */}
             <div className="flex flex-col items-end gap-1 w-48 mt-2">
               <div className="flex items-center gap-2 text-sm font-bold tracking-widest">
                  <Zap className={cn("w-4 h-4", stamina < 20 && "text-red-500")} />
                  <span className={cn(stamina < 20 && "text-red-500")}>STAMINA: {Math.floor(stamina)}%</span>
               </div>
               <Slider
                  value={[stamina]}
                  max={100}
                  step={1}
                  className={cn(
                    "w-full [&_[role=slider]]:border-transparent",
                    "[&_[role=slider]]:bg-white",
                    stamina > 50 ? "[&>.relative>.absolute]:bg-green-500" :
                    stamina > 20 ? "[&>.relative>.absolute]:bg-yellow-500" :
                    "[&>.relative>.absolute]:bg-red-600"
                  )}
                  disabled
               />
             </div>
             <div className="text-sm opacity-70 mt-1">ISO 800 F/2.8</div>
          </div>
        </div>
        {/* Center Crosshair (Minimal) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40">
           <div className="w-1 h-8 bg-white/50 absolute left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
           <div className="w-8 h-1 bg-white/50 absolute left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        {/* Bottom Bar */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <div className="text-lg sm:text-xl font-bold drop-shadow-md">
               {timeString}
            </div>
            <div className="flex gap-4 mt-1">
              <div className="text-xs opacity-60 font-light">JUN 12 1998</div>
              <div className="text-xs opacity-60 font-mono">FPS: {localFPS}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 opacity-60">
            <Disc3 className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-xs tracking-widest">SAVING TO MAG-TAPE...</span>
          </div>
        </div>
      </div>
    </>
  );
}