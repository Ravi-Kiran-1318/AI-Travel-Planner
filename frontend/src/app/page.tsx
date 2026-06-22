'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import RedirectOverlay from '../components/RedirectOverlay';

export default function LandingPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('Navigating...');

  const handleRedirect = (path: string, message: string = 'Navigating...') => {
    setRedirectMessage(message);
    setIsRedirecting(true);
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden animate-pageFadeIn">
      {isRedirecting && <RedirectOverlay message={redirectMessage} />}
      
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center border-b border-slate-900 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleRedirect('/', 'Loading Home...')}>
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Trao AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleRedirect('/login', 'Connecting to Session...')}
            className="text-slate-400 hover:text-white text-sm font-semibold transition"
          >
            Login
          </button>
          <button
            onClick={() => handleRedirect('/register', 'Preparing Portal...')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/20"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24 flex-1 flex flex-col items-center justify-center text-center z-10">
        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Your Next Journey,<br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Tailored by AI
          </span>
        </h1>
        <p className="text-slate-400 text-base md:text-xl max-w-2xl mb-10 leading-relaxed">
          Trao AI Travel Planner generates structured, day-by-day itineraries, forecasts realistic budget estimations, suggests hotels, and curates packing lists suited for your climate.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <button
            onClick={() => handleRedirect('/register', 'Creating Workspace...')}
            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-650 hover:to-purple-700 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl hover:shadow-indigo-500/20 transition duration-300 transform hover:-translate-y-0.5"
          >
            Start Planning For Free
          </button>
          <button
            onClick={() => handleRedirect('/login', 'Opening Travel Dashboard...')}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-base px-8 py-4 rounded-2xl border border-slate-800 transition duration-300"
          >
            Sign In to Dashboard
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-8">
          <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-3xl text-left hover:border-slate-800 transition duration-300">
            <span className="text-3xl">🗓️</span>
            <h3 className="text-lg font-bold text-white mt-4 mb-2">Smart Day Timeline</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Get an hour-by-hour structured activity list complete with cost projections. Make instant edits or tell AI to regenerate any day.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-3xl text-left hover:border-slate-800 transition duration-300">
            <span className="text-3xl">💵</span>
            <h3 className="text-lg font-bold text-white mt-4 mb-2">Financial Cost Ledger</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Never get surprised by costs. Receive a detailed budget breakdown for transport, food, accommodation, and activities.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-3xl text-left hover:border-slate-800 transition duration-300">
            <span className="text-3xl">⛈️</span>
            <h3 className="text-lg font-bold text-white mt-4 mb-2">Weather Packing Assistant</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our unique feature cross-references local weather and selected destinations to output a dynamic, tickable gear checklist.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-900 text-center text-slate-600 text-xs z-10">
        <p>&copy; {new Date().getFullYear()} Trao AI Travel Planner. All rights reserved.</p>
      </footer>
    </div>
  );
}
