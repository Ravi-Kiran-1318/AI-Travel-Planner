'use client';

import React from 'react';

interface RedirectOverlayProps {
  message?: string;
}

export default function RedirectOverlay({ message = 'Navigating...' }: RedirectOverlayProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex flex-col justify-center items-center gap-4 animate-fadeIn pointer-events-auto">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-14 h-14">
          <div className="w-full h-full rounded-full border-4 border-slate-900" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-blue-400 border-b-transparent border-l-transparent animate-spin" />
        </div>
        
        <p className="text-slate-300 text-xs font-semibold tracking-wider uppercase animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
