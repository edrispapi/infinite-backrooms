import React, { useEffect, useState } from 'react';
import { Battery, Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils';
interface GameHUDProps {
  isLocked: boolean;
}
export function GameHUD({ isLocked }: GameHUDProps) {
  // Simulating a diegetic camcorder interface
  const [timeString, setTimeString] = useState("00:00:00 PM");
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        // Retro format
        setTimeString(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
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
          </div>
          <div className="text-sm opacity-70 tracking-wider">TAPE_004 // [LIVE_FEED]</div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
           <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold drop-shadow-md">
             <Battery className="w-6 h-6 sm:w-8 sm:h-8 fill-white/20" />
             <span>84%</span>
           </div>
           <div className="text-sm opacity-70">ISO 800 F/2.8</div>
        </div>
      </div>
      {/* Center Crosshair (Minimal) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40">
         <div className="w-1 h-8 bg-white/50 absolute left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
         <div className="w-8 h-1 bg-white/50 absolute left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      {/* Bottom Bar */}
      <div className="flex justify-between items-end">
        <div className="text-lg sm:text-xl font-bold drop-shadow-md">
           {timeString}
           <div className="text-xs opacity-60 mt-1 font-light">JUN 12 1998</div>
        </div>
        <div className="flex items-center gap-4 opacity-60">
          <Disc3 className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-xs tracking-widest">SAVING TO MAG-TAPE...</span>
        </div>
      </div>
    </div>
  );
}