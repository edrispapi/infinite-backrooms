import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skull, XCircle, RotateCcw, Menu } from 'lucide-react';
interface DeathScreenProps {
  onRetry: () => void;
  onMenu: () => void;
}
export function DeathScreen({ onRetry, onMenu }: DeathScreenProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/80 backdrop-blur-md animate-in fade-in duration-1000">
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="w-full border-red-500/30 bg-black/90 text-red-100 shadow-[0_0_50px_rgba(220,38,38,0.3)] backdrop-filter">
          <CardHeader className="text-center space-y-4 pb-8">
            <motion.div 
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto bg-red-900/20 p-4 rounded-full border border-red-500/30"
            >
              <Skull className="w-12 h-12 text-red-500" />
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-5xl font-mono tracking-[0.2em] uppercase text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
                YOU DIED
              </CardTitle>
              <CardDescription className="font-mono text-red-400/70 text-lg" dir="rtl">
                چیزی پیدات کرد...
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-12 pb-12">
            <div className="text-center font-mono text-xs text-red-500/50 uppercase tracking-widest mb-4">
              Vital Signs: TERMINATED
              <br/>
              Simulation Halted
            </div>
            <Button
              onClick={onRetry}
              className="h-14 bg-red-600 hover:bg-red-500 text-white border-none font-mono uppercase tracking-widest text-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] transition-all duration-300"
            >
              <RotateCcw className="mr-3 w-5 h-5" />
              Retry / تلاش مجدد
            </Button>
            <Button
              onClick={onMenu}
              variant="outline"
              className="h-12 border-red-900/50 text-red-400 hover:bg-red-950/50 hover:text-red-200 font-mono uppercase tracking-widest text-sm"
            >
              <Menu className="mr-2 w-4 h-4" />
              Return to Menu / بازگش��
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}