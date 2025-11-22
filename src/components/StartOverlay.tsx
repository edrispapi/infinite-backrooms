import React from 'react';
import { Button } from "@/components/ui/button";
import { Play } from 'lucide-react';
interface StartOverlayProps {
  onStart: () => void;
}
export function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,220,0.15),rgba(0,0,0,0.95))] text-br-text p-6 text-center animate-in fade-in duration-700">
      <h1 className="text-4xl sm:text-6xl font-bold tracking-[0.2em] mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] uppercase">
        BACKROOMS WEB
      </h1>
      <div className="max-w-lg space-y-6 bg-black/40 backdrop-blur-sm p-8 rounded-lg border border-white/10 shadow-2xl" dir="rtl">
        <p className="text-lg leading-relaxed opacity-90">
          ب��ای شروع روی دکمه زیر کلیک کن، ماوس قفل می‌شه و می‌تونی با
          <strong className="mx-1 text-yellow-200 font-mono">W A S D</strong>
          حرک�� کنی و با ماوس نگاه کنی.
        </p>
        <p className="text-base opacity-80">
          برای دویدن کلید <strong className="mx-1 text-yellow-200 font-mono">Shift</strong> رو نگه دا��.
        </p>
        <p className="text-base opacity-80">
          برای تغییر کیفیت <strong className="mx-1 text-yellow-200 font-mono">Q</strong> بزن.
        </p>
      </div>
      <Button 
        onClick={onStart}
        className="mt-12 px-12 py-6 text-lg bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] rounded-full group"
      >
        <Play className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        شروع ��ازی
      </Button>
      <div className="mt-8 text-xs opacity-50 font-mono tracking-widest uppercase">
        Press ESC to Pause / Release Cursor
      </div>
    </div>
  );
}