import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, RotateCcw, Settings } from 'lucide-react';
interface PauseMenuProps {
  onResume: () => void;
  onReset: () => void; // Placeholder for future phase
}
export function PauseMenu({ onResume, onReset }: PauseMenuProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-md border-white/10 bg-black/80 text-br-text shadow-2xl backdrop-filter">
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
          <Button 
            variant="outline"
            disabled
            className="h-14 border-white/10 bg-transparent text-white/30 cursor-not-allowed font-mono uppercase tracking-widest"
          >
            <Settings className="mr-4 w-5 h-5" />
            Settings (OFFLINE)
          </Button>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
          <Button 
             onClick={() => window.location.reload()}
             variant="destructive"
             className="h-12 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-200 font-mono uppercase tracking-widest text-sm"
          >
            <RotateCcw className="mr-2 w-4 h-4" />
            Abort / Reset Simulation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}