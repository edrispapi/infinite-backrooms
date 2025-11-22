import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from '@/components/ui/slider';
import { Play, RotateCcw, Volume2, Monitor, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
interface PauseMenuProps {
  onResume: () => void;
  onReset: () => void;
  volume: number;
  isMuted: boolean;
  quality: 'high' | 'low';
  onVolumeChange: (vol: number) => void;
  onMute: () => void;
  onQualityToggle: () => void;
}
export function PauseMenu({ 
  onResume, 
  onReset, 
  volume, 
  isMuted, 
  quality, 
  onVolumeChange, 
  onMute, 
  onQualityToggle 
}: PauseMenuProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="w-full border-white/10 bg-black/80 text-br-text shadow-2xl backdrop-filter">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-1 bg-yellow-600/50 rounded-full mb-4" />
            <CardTitle className="text-4xl font-mono tracking-[0.2em] uppercase text-yellow-100 drop-shadow-[0_0_10px_rgba(217,207,122,0.4)]">
              PAUSED
            </CardTitle>
            <CardDescription className="font-mono text-yellow-100/50 text-xs uppercase tracking-widest">
              Reality Anchor: Unstable
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-12 pb-12">
            <Button
              onClick={onResume}
              variant="outline"
              className="h-14 border-white/20 bg-white/5 hover:bg-yellow-900/20 hover:text-yellow-200 hover:border-yellow-500/50 transition-all duration-300 font-mono uppercase tracking-widest text-lg group"
            >
              <Play className="mr-4 w-5 h-5 group-hover:scale-110 transition-transform" />
              Resume Protocol
            </Button>
            {/* Settings Section */}
            <div className="space-y-4 p-4 border border-white/10 rounded-lg bg-white/5">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="opacity-70">VOLUME</span>
                <Slider 
                  value={[volume]} 
                  max={100} 
                  step={1} 
                  onValueChange={([val]) => onVolumeChange(val)} 
                  className="w-32" 
                />
              </div>
              <Button 
                onClick={onMute} 
                variant="outline" 
                className="w-full h-10 border-white/10 hover:bg-white/10 font-mono text-xs uppercase tracking-wider"
              >
                <Volume2 className={cn("mr-2 w-4 h-4", isMuted && "opacity-50")} />
                {isMuted ? "Unmute Audio" : "Mute Audio"}
              </Button>
              <div className="h-px bg-white/10 my-2" />
              <Button 
                onClick={onQualityToggle} 
                variant="outline" 
                className="w-full h-10 justify-between border-white/10 hover:bg-white/10 font-mono text-xs uppercase tracking-wider"
              >
                <div className="flex items-center">
                  <Monitor className="mr-2 w-4 h-4" />
                  Quality: <span className={cn("ml-2 font-bold", quality === 'low' ? "text-yellow-500" : "text-green-500")}>{quality.toUpperCase()}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </Button>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
            <Button
               onClick={onReset}
               variant="destructive"
               className="h-12 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-200 font-mono uppercase tracking-widest text-sm"
            >
              <RotateCcw className="mr-2 w-4 h-4" />
              Abort / Reset Simulation
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}