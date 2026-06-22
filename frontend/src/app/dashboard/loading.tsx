'use client';

import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Mock Header Skeleton */}
      <header className="max-w-7xl mx-auto w-full flex justify-between items-center border-b border-slate-900 pb-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-900 rounded-md animate-pulse" />
            <div className="h-3 w-32 bg-slate-950/60 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-9 w-28 bg-slate-900 rounded-xl animate-pulse" />
        </div>
      </header>

      {/* Main Workspace Skeleton */}
      <main className="max-w-7xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel Skeleton */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 h-[250px] space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-5 w-32 bg-slate-800 rounded" />
              <div className="h-8 w-20 bg-slate-800 rounded-lg" />
            </div>
            <div className="space-y-3">
              <div className="h-12 bg-slate-950/60 rounded-xl" />
              <div className="h-12 bg-slate-950/60 rounded-xl" />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 h-[220px] space-y-4 animate-pulse">
            <div className="h-5 w-40 bg-slate-800 rounded" />
            <div className="space-y-3">
              <div className="h-4 bg-slate-950/60 rounded" />
              <div className="h-4 bg-slate-950/60 rounded" />
              <div className="h-4 bg-slate-950/60 rounded" />
            </div>
          </div>
        </div>

        {/* Center & Right Panel Skeleton */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 min-h-[500px] flex flex-col justify-center items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="w-full h-full rounded-full border-4 border-slate-950" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-blue-400 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-slate-400 text-sm font-semibold tracking-wider animate-pulse">
            Synchronizing Trip Archives...
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-slate-700 text-[10px] mt-8">
        Secure Enclave Transmission
      </footer>
    </div>
  );
}
