'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="text-center z-10 flex flex-col items-center gap-6 animate-fadeIn">
        {/* Glowing Logo Icon */}
        <div className="relative">
          <div className="text-5xl animate-bounce">✈️</div>
          <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-md animate-pulse pointer-events-none" />
        </div>

        {/* Dynamic Spinner */}
        <div className="relative w-16 h-16">
          {/* Outer track */}
          <div className="w-full h-full rounded-full border-4 border-slate-900" />
          {/* Spinning colored segment */}
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-blue-400 border-b-transparent border-l-transparent animate-spin" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Trao AI
          </h2>
          <p className="text-slate-400 text-sm font-medium animate-pulse">
            Connecting to Travel Enclave...
          </p>
        </div>
      </div>
    </div>
  );
}
