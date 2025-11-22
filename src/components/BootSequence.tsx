import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
interface BootSequenceProps {
  onComplete: () => void;
}
const bootLines = [
  "BIOS DATE 06/12/98 14:22:05 VER 1.02",
  "CPU: QUANTUM NEURAL NET PROCESSOR",
  "CHECKING MEMORY... 640K OK",
  "LOADING REALITY ENGINE... OK",
  "INITIALIZING PROCEDURAL GENERATION...",
  "LOADING ASSETS: TEXTURES... OK",
  "LOADING ASSETS: AUDIO... OK",
  "ENGAGING POINTER LOCK PROTOCOLS...",
  "ESTABLISHING NEURAL LINK...",
  "SYSTEM READY."
];
export function BootSequence({ onComplete }: BootSequenceProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let lineIndex = 0;
    const lineInterval = setInterval(() => {
      if (lineIndex < bootLines.length) {
        setLines(prev => [...prev, bootLines[lineIndex]]);
        lineIndex++;
      } else {
        clearInterval(lineInterval);
        // Start progress bar after lines are done
        let prog = 0;
        const progInterval = setInterval(() => {
          prog += 2;
          setProgress(prog);
          if (prog >= 100) {
            clearInterval(progInterval);
            setTimeout(onComplete, 800); // Short delay after 100%
          }
        }, 30);
      }
    }, 400); // Speed of new lines
    return () => {
      clearInterval(lineInterval);
    };
  }, [onComplete]);
  return (
    <div className="absolute inset-0 z-[100] bg-black text-green-500 font-mono p-8 sm:p-12 overflow-hidden flex flex-col justify-between pointer-events-none">
      {/* CRT Scanline Overlay for Boot Screen */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
      <div className="flex flex-col gap-2 z-20">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm sm:text-base tracking-wider shadow-green-500/50 drop-shadow-sm"
          >
            {line}
          </motion.div>
        ))}
        <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="w-3 h-5 bg-green-500 mt-2"
        />
      </div>
      <div className="w-full max-w-2xl mb-12 z-20">
        <div className="flex justify-between text-xs mb-2 uppercase tracking-widest opacity-80">
            <span>Loading Resources</span>
            <span>{progress}%</span>
        </div>
        <div className="h-4 w-full border border-green-800 p-0.5">
            <div 
                className="h-full bg-green-600 shadow-[0_0_10px_rgba(22,163,74,0.5)] transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
            />
        </div>
      </div>
    </div>
  );
}