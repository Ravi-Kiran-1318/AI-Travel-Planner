'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../utils/api';
import { Trip } from '../../../types';
import ItineraryCard from '../../../components/ItineraryCard';
import PackingList from '../../../components/PackingList';
import RedirectOverlay from '../../../components/RedirectOverlay';

export default function SharePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const tripId = params.id;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY'>('USD');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('Navigating...');

  const CURRENCIES = {
    USD: { symbol: '$', rate: 1.0 },
    EUR: { symbol: '€', rate: 0.92 },
    GBP: { symbol: '£', rate: 0.79 },
    INR: { symbol: '₹', rate: 83.5 },
    JPY: { symbol: '¥', rate: 158.0 },
  };

  const formatAmount = (usdValue: number) => {
    const { symbol, rate } = CURRENCIES[currency];
    return `${symbol}${(usdValue * rate).toFixed(0)}`;
  };

  useEffect(() => {
    if (tripId) {
      loadPublicTrip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const loadPublicTrip = async () => {
    try {
      setLoading(true);
      const data = await api.trips.getPublic(tripId);
      setTrip(data);
    } catch (err: any) {
      console.error('Error fetching public trip:', err);
      setError(err.message || 'This itinerary is private or does not exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = (path: string, message: string = 'Navigating...') => {
    setRedirectMessage(message);
    setIsRedirecting(true);
    router.push(path);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-950 text-slate-100 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm font-semibold tracking-wider text-slate-400 animate-pulse">
          Fetching shared vacation plan...
        </p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-950 text-slate-100 gap-6 p-4 text-center">
        {isRedirecting && <RedirectOverlay message={redirectMessage} />}
        <p className="text-6xl">🔒</p>
        <h1 className="text-2xl font-bold text-slate-200">Access Denied / Private Trip</h1>
        <p className="text-sm text-slate-500 max-w-md">
          {error || 'This travel itinerary is private or has sharing disabled. Please contact the owner for access.'}
        </p>
        <button
          onClick={() => handleRedirect('/login', 'Connecting...')}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl transition shadow-xl"
        >
          Sign In to Planner
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col justify-between animate-pageFadeIn">
      {isRedirecting && <RedirectOverlay message={redirectMessage} />}
      
      <div>
        {/* Header */}
        <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-slate-900 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRedirect('/', 'Loading Home...')}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 p-2.5 rounded-xl transition flex items-center justify-center no-print"
              title="Go to Home Page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                Shared Itinerary
              </h1>
              <p className="text-xs text-slate-500 mt-1">Shared vacation view • Read-only</p>
            </div>
          </div>
          <button
            onClick={() => handleRedirect('/register', 'Creating Planner...')}
            className="bg-indigo-600 hover:bg-indigo-500 transition text-white px-4 py-2.5 rounded-xl text-xs font-bold no-print"
          >
            Create Your Own Plan ✈️
          </button>
        </header>

        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel: Budget Ledger, Hotels, Climate */}
          <div className="space-y-6">
            {/* Financial cost ledger */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-bold text-white">Financial Cost Ledger</h3>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs py-1.5 px-2 outline-none focus:border-indigo-500 font-medium no-print"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <div className="space-y-3.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Transport & Transit:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {formatAmount(trip.estimatedBudget?.transport || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Lodging & Hotels:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {formatAmount(trip.estimatedBudget?.accommodation || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Culinary & Food:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {formatAmount(trip.estimatedBudget?.food || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Activities Booking:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {formatAmount(trip.estimatedBudget?.activities || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-800 pt-4 text-white font-bold">
                  <span className="text-indigo-400">Grand Estimated Total:</span>
                  <span className="font-mono text-indigo-400 text-lg">
                    {formatAmount(trip.estimatedBudget?.total || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Climate Outlook */}
            {trip.climate && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white">Climate Outlook</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-850">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Avg Temp</span>
                    <span className="font-semibold text-slate-200">{trip.climate.temperatureRange || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-850">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Rainfall</span>
                    <span className="font-semibold text-slate-200 text-xs truncate">{trip.climate.rainfall || 'N/A'}</span>
                  </div>
                </div>
                {trip.climate.weatherSummary && (
                  <p className="text-xs text-slate-400 bg-slate-950/20 border border-slate-850/50 p-3 rounded-xl leading-relaxed">
                    ☀️ {trip.climate.weatherSummary}
                  </p>
                )}
              </div>
            )}

            {/* Hotel suggestions */}
            {trip.hotels && trip.hotels.length > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white">Hotel Recommendations</h3>
                <div className="space-y-4">
                  {trip.hotels.map((hotel, idx) => (
                    <div key={idx} className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl relative overflow-hidden">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-sm text-slate-200 leading-snug">{hotel.name}</span>
                        {hotel.rating && (
                          <span className="text-xs bg-indigo-950/50 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-900/30 shrink-0 font-medium">
                            ★ {hotel.rating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <span>{hotel.tier || 'Suggested'}</span>
                        {hotel.estimatedCostNightUSD && (
                          <span className="text-slate-400 font-mono font-semibold">
                            {formatAmount(hotel.estimatedCostNightUSD)}/night
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Itinerary, Packing Checklist */}
          <div className="lg:col-span-2 space-y-8">
            <ItineraryCard trip={trip} isReadOnly={true} currency={currency} />
            <PackingList trip={trip} isReadOnly={true} />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-slate-700 text-xs py-8 border-t border-slate-900 mt-12 no-print">
        <p>Trao AI Travel Planner &copy; {new Date().getFullYear()} • Read-Only Sharing</p>
      </footer>
    </div>
  );
}
