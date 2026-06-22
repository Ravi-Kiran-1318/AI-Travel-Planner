'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RedirectOverlay from '../components/RedirectOverlay';

export default function LandingPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('Navigating...');
  const [hasSession, setHasSession] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setHasSession(true);
      const savedUser = localStorage.getItem('savedUsername');
      if (savedUser) {
        setUsername(savedUser);
      } else {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const decoded = JSON.parse(window.atob(base64));
          setUsername(decoded?.username || 'Traveler');
        } catch (e) {
          setUsername('Traveler');
        }
      }
    }
  }, []);

  const handleRedirect = (path: string, message: string = 'Navigating...') => {
    setRedirectMessage(message);
    setIsRedirecting(true);
    router.push(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('savedUsername');
    localStorage.removeItem('lastActive');
    setHasSession(false);
    setUsername('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden animate-pageFadeIn">
      {isRedirecting && <RedirectOverlay message={redirectMessage} />}
      
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-4 flex justify-between items-center border-b border-slate-900 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleRedirect('/', 'Loading Home...')}>
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Trao AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          {hasSession ? (
            <>
              <div className="hidden sm:flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl text-xs">
                <span className="text-slate-500">👤 Logged in as</span>
                <span className="font-semibold text-indigo-400">{username}</span>
              </div>
              <button
                onClick={() => handleRedirect('/dashboard', 'Loading Workspace...')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 transition text-red-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                title="Log Out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-8 md:py-12 flex-1 flex flex-col items-center justify-center text-center z-10">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
          Your Next Journey,<br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Tailored by AI
          </span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mb-6 leading-relaxed">
          Trao AI Travel Planner generates structured, day-by-day itineraries, forecasts realistic budget estimations, suggests hotels, and curates packing lists suited for your climate.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {hasSession ? (
            <button
              onClick={() => handleRedirect('/dashboard', 'Opening Dashboard...')}
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-650 hover:to-purple-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-xl hover:shadow-indigo-500/20 transition duration-300 transform hover:-translate-y-0.5"
            >
              Go to Your Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => handleRedirect('/register', 'Creating Workspace...')}
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-650 hover:to-purple-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-xl hover:shadow-indigo-500/20 transition duration-300 transform hover:-translate-y-0.5"
              >
                Start Planning For Free
              </button>
              <button
                onClick={() => handleRedirect('/login', 'Opening Travel Dashboard...')}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm px-6 py-3 rounded-xl border border-slate-800 transition duration-300"
              >
                Sign In to Dashboard
              </button>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-4">
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-left hover:border-slate-800 transition duration-300">
            <span className="text-2xl">🗓️</span>
            <h3 className="text-base font-bold text-white mt-3 mb-1.5">Smart Day Timeline</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Get an hour-by-hour structured activity list complete with cost projections. Make instant edits or tell AI to regenerate any day.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-left hover:border-slate-800 transition duration-300">
            <span className="text-2xl">💵</span>
            <h3 className="text-base font-bold text-white mt-3 mb-1.5">Financial Cost Ledger</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Never get surprised by costs. Receive a detailed budget breakdown for transport, food, accommodation, and activities.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-left hover:border-slate-800 transition duration-300">
            <span className="text-2xl">⛈️</span>
            <h3 className="text-base font-bold text-white mt-3 mb-1.5">Weather Packing Assistant</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Our unique feature cross-references local weather and selected destinations to output a dynamic, tickable gear checklist.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-4 border-t border-slate-900 text-center text-slate-600 text-[10px] z-10">
        <p>&copy; {new Date().getFullYear()} Trao AI Travel Planner. All rights reserved.</p>
      </footer>
    </div>
  );
}
