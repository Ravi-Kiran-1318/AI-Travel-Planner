'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import RedirectOverlay from '../../components/RedirectOverlay';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('Navigating...');

  // Active Session states
  const [hasSession, setHasSession] = useState(false);
  const [savedUser, setSavedUser] = useState('');
  const [lastActive, setLastActive] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setHasSession(true);
      const username = localStorage.getItem('savedUsername');
      if (username) {
        setSavedUser(username);
      } else {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const decoded = JSON.parse(window.atob(base64));
          setSavedUser(decoded?.username || 'Traveler');
        } catch (e) {
          setSavedUser('Traveler');
        }
      }
      setLastActive(localStorage.getItem('lastActive') || new Date().toLocaleString());
    }
  }, []);

  const handleClearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('savedUsername');
    localStorage.removeItem('lastActive');
    setHasSession(false);
  };

  const handleRedirect = (path: string, message: string = 'Navigating...') => {
    setRedirectMessage(message);
    setIsRedirecting(true);
    router.push(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.auth.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('savedUsername', data.user.username);
      localStorage.setItem('lastActive', new Date().toLocaleString());
      handleRedirect('/dashboard', 'Preparing Dashboard...');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden animate-pageFadeIn">
      {isRedirecting && <RedirectOverlay message={redirectMessage} />}
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-fadeIn">
        {hasSession ? (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="text-4xl">✈️</span>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                Trao AI
              </span>
            </div>
            
            <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-2xl mb-8 text-center">
              <span className="text-3xl block mb-2">👤</span>
              <h3 className="text-lg font-bold text-white leading-snug">Active Session Detected</h3>
              <p className="text-slate-400 text-sm mt-1">
                Logged in as <span className="text-indigo-400 font-bold">{savedUser}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">
                Last active: {lastActive}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleRedirect('/dashboard', 'Opening Dashboard...')}
                className="w-full block bg-gradient-to-r from-blue-500 to-indigo-650 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition duration-200 text-sm"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleClearSession}
                className="w-full bg-slate-800/80 hover:bg-slate-850 text-slate-300 font-semibold py-3.5 rounded-xl border border-slate-800 transition duration-200 text-sm"
              >
                Sign Out / Switch Account
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div 
                onClick={() => handleRedirect('/', 'Loading Home...')}
                className="inline-flex items-center gap-2 mb-4 cursor-pointer"
              >
                <span className="text-3xl">✈️</span>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                  Trao AI
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
              <p className="text-slate-400 text-sm mt-1">Sign in to manage your itineraries</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg transition duration-200 mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="text-center text-slate-400 text-xs mt-8">
              Don&apos;t have an account?{' '}
              <button 
                onClick={() => handleRedirect('/register', 'Loading Registration...')}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition bg-transparent border-none p-0 inline-block align-baseline"
              >
                Create account
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
