import React from 'react';
import { Button } from "@/components/ui/button";
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';
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
          برای شروع روی دکمه زیر کلیک کن، ماوس قفل می‌شه و می‌��ونی با
          <strong className="mx-1 text-yellow-200 font-mono">W A S D</strong>
          حر��ت کنی و با ماوس نگاه کنی.
        </p>
        <p className="text-base opacity-80">
          برای دویدن کلید <strong className="mx-1 text-yellow-200 font-mono">Shift</strong> رو نگه دار.
        </p>
        <p className="text-base opacity-80">
          برای تغییر کیفیت <strong className="mx-1 text-yellow-200 font-mono">Q</strong> بزن.
          برای توقف <strong className="mx-1 text-yellow-200 font-mono">ESC</strong> فشار بده.
        </p>
        <p className="text-base opacity-80 border-t border-white/10 pt-4 mt-4">
          می‌تونی سطح رو از منو تغییر بدی: <strong className="mx-1 text-yellow-200 font-mono">Backrooms (دفتر زرد)</strong> ی�� <strong className="mx-1 text-yellow-200 font-mono">Hill (خانه روی تپه)</strong>.
        </p>
      </div>
      <motion.div
        whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(255,255,220,0.3)' }}
        whileTap={{ scale: 0.95 }}
        className="mt-12 rounded-full"
      >
        <Button
          onClick={onStart}
          className="px-12 py-6 text-lg bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all duration-300 rounded-full group"
        >
          <Play className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          شروع بازی
        </Button>
      </motion.div>
      <div className="mt-8 text-xs opacity-50 font-mono tracking-widest uppercase">
        Press ESC to Pause / Release Cursor - برای خرو�� از بازی، Escape رو بزن
      </div>
    </div>
  );
}