'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../utils/api';
import { Trip } from '../../types';
import CreateTripForm from '../../components/CreateTripForm';
import ItineraryCard from '../../components/ItineraryCard';
import PackingList from '../../components/PackingList';
import RedirectOverlay from '../../components/RedirectOverlay';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [username, setUsername] = useState('Traveler');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('Navigating...');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Sharing & Currency Conversion states
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY'>('USD');
  const [copied, setCopied] = useState(false);

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

  const shareUrl = selectedTrip
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${selectedTrip._id}`
    : '';

  const handleToggleShare = async (newValue: boolean) => {
    if (!selectedTrip) return;
    setRedirectMessage('Updating Visibility Settings...');
    setIsRedirecting(true);
    try {
      const updated = await api.trips.update(selectedTrip._id, { isPublic: newValue });
      handleUpdateTripState(updated);
    } catch (err: any) {
      console.error('Failed to toggle share state:', err);
      alert(err.message || 'Failed to update share settings.');
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Authenticate user & load trips
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const decoded = parseJwt(token);
    if (decoded && decoded.username) {
      setUsername(decoded.username);
      localStorage.setItem('savedUsername', decoded.username);
      localStorage.setItem('lastActive', new Date().toLocaleString());
    }
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await api.trips.getAll();
      setTrips(data);
      if (data.length > 0) {
        setSelectedTrip(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching trips:', err);
      setError(err.message || 'Failed to load itineraries.');
      // If unauthorized, token might be expired
      if (err.message && err.message.includes('Token')) {
        handleSignOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (formData: {
    destination: string;
    durationDays: number;
    budgetTier: string;
    interests: string[];
  }) => {
    setFormLoading(true);
    setError('');
    try {
      const newTrip = await api.trips.create(formData);
      setTrips((prevTrips) => [newTrip, ...prevTrips]);
      setSelectedTrip(newTrip);
      setShowCreateForm(false);
    } catch (err: any) {
      console.error('Error creating trip:', err);
      setError(err.message || 'Failed to generate itinerary. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTripState = (updatedTrip: Trip) => {
    // Update active trip in state
    setSelectedTrip(updatedTrip);
    // Update in list
    setTrips((prevTrips) => prevTrips.map((t) => (t._id === updatedTrip._id ? updatedTrip : t)));
  };

  const handleRegenerateDay = async (dayNumber: number, instructions: string) => {
    if (!selectedTrip) return;
    setRedirectMessage('AI is reconstructing your day plan...');
    setIsRedirecting(true);
    try {
      const updatedTrip = await api.trips.regenerateDay(selectedTrip._id, dayNumber, instructions);
      handleUpdateTripState(updatedTrip);
    } catch (err: any) {
      console.error('Failed to regenerate day:', err);
      alert(err.message || 'Error occurred during day regeneration. Please retry.');
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip itinerary?')) return;
    setRedirectMessage('Deleting Itinerary...');
    setIsRedirecting(true);
    try {
      await api.trips.delete(id);
      const updatedTrips = trips.filter((t) => t._id !== id);
      setTrips(updatedTrips);
      if (selectedTrip?._id === id) {
        setSelectedTrip(updatedTrips.length > 0 ? updatedTrips[0] : null);
      }
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert(err.message || 'Failed to delete the trip.');
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleSignOut = () => {
    setRedirectMessage('Signing Out of Enclave...');
    setIsRedirecting(true);
    localStorage.removeItem('token');
    localStorage.removeItem('savedUsername');
    localStorage.removeItem('lastActive');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-950 text-slate-100 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm font-semibold tracking-wider text-slate-400 animate-pulse">
          Accessing Secure Data Enclave...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col justify-between animate-pageFadeIn">
      {isRedirecting && <RedirectOverlay message={redirectMessage} />}
      
      <div>
        {/* Header */}
        <header className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center border-b border-slate-900 pb-5 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRedirectMessage('Loading Home...');
                setIsRedirecting(true);
                router.push('/');
              }}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 p-2.5 rounded-xl transition flex items-center justify-center no-print"
              title="Go to Home Page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                {getGreeting()}, {username}!
              </h1>
              <p className="text-xs text-slate-500 mt-1">Logged in • Enforced User Isolation Enclave</p>
            </div>
          </div>
          <div className="flex items-center gap-4 no-print">
            <button
              onClick={handleSignOut}
              className="bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 transition text-red-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Global error banner */}
        {error && (
          <div className="max-w-7xl mx-auto bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-2xl mb-6">
            {error}
          </div>
        )}

        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel: Active trips and New Trip trigger */}
          <div className="space-y-6">
            {/* Active Trips Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white">Your Itineraries</h2>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  {showCreateForm ? 'View Trips' : 'New Plan ✈️'}
                </button>
              </div>

              {showCreateForm ? (
                <CreateTripForm onSubmit={handleCreateTrip} isLoading={formLoading} />
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {trips.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      <p className="text-3xl mb-3">🧭</p>
                      <p>No active itineraries.</p>
                      <p className="text-xs text-slate-600 mt-1">Create one to start planning.</p>
                    </div>
                  ) : (
                    trips.map((trip) => (
                      <div
                        key={trip._id}
                        className={`group flex items-center justify-between p-4 rounded-2xl border transition duration-300 ${
                          selectedTrip?._id === trip._id
                            ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                            : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <button
                          onClick={() => setSelectedTrip(trip)}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="font-bold text-sm truncate">{trip.destination}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {trip.durationDays} Days • {trip.budgetTier} Budget
                          </p>
                        </button>
                        <button
                          onClick={() => handleDeleteTrip(trip._id)}
                          className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition duration-300 p-1.5 rounded-lg"
                          title="Delete trip"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Financial cost ledger */}
            {selectedTrip && !showCreateForm && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-lg font-bold text-white">Financial Cost Ledger</h3>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs py-1.5 px-2 outline-none focus:border-indigo-500 font-medium"
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
                      {formatAmount(selectedTrip.estimatedBudget?.transport || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Lodging & Hotels:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {formatAmount(selectedTrip.estimatedBudget?.accommodation || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Culinary & Food:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {formatAmount(selectedTrip.estimatedBudget?.food || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Activities Booking:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {formatAmount(selectedTrip.estimatedBudget?.activities || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-800 pt-4 text-white font-bold">
                    <span className="text-indigo-400">Grand Estimated Total:</span>
                    <span className="font-mono text-indigo-400 text-lg">
                      {formatAmount(selectedTrip.estimatedBudget?.total || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Share settings */}
            {selectedTrip && !showCreateForm && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white">Share Itinerary</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Enable Public Share Link</span>
                  <button
                    onClick={() => handleToggleShare(!selectedTrip.isPublic)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedTrip.isPublic ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        selectedTrip.isPublic ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {selectedTrip.isPublic && (
                  <div className="space-y-2 pt-2 border-t border-slate-850">
                    <p className="text-xs text-slate-500">Anyone with this link can view this plan read-only:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 bg-slate-950/80 border border-slate-850 text-xs rounded-xl px-3 py-2 text-slate-400 focus:outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="bg-indigo-950/50 hover:bg-indigo-900 border border-indigo-900 text-indigo-400 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition"
                      >
                        {copied ? 'Copied! ✅' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Climate Outlook */}
            {selectedTrip && !showCreateForm && selectedTrip.climate && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white">Climate Outlook</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-850">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Avg Temp</span>
                    <span className="font-semibold text-slate-200">{selectedTrip.climate.temperatureRange || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-850">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Rainfall</span>
                    <span className="font-semibold text-slate-200 text-xs truncate">{selectedTrip.climate.rainfall || 'N/A'}</span>
                  </div>
                </div>
                {selectedTrip.climate.weatherSummary && (
                  <p className="text-xs text-slate-400 bg-slate-950/20 border border-slate-850/50 p-3 rounded-xl leading-relaxed">
                    ☀️ {selectedTrip.climate.weatherSummary}
                  </p>
                )}
              </div>
            )}

            {/* Hotel suggestions */}
            {selectedTrip && !showCreateForm && selectedTrip.hotels && selectedTrip.hotels.length > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white">Hotel Recommendations</h3>
                <div className="space-y-4">
                  {selectedTrip.hotels.map((hotel, idx) => (
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

          {/* Right panel: Active Trip content */}
          <div className="lg:col-span-2 space-y-8">
            {selectedTrip && !showCreateForm ? (
              <>
                <ItineraryCard
                  trip={selectedTrip}
                  onUpdateTrip={handleUpdateTripState}
                  onRegenerateDay={handleRegenerateDay}
                  currency={currency}
                />
                <PackingList trip={selectedTrip} onUpdateTrip={handleUpdateTripState} />
              </>
            ) : (
              !showCreateForm && (
                <div className="flex flex-col justify-center items-center h-[500px] bg-slate-900/30 border border-slate-850 border-dashed rounded-3xl p-8 text-center text-slate-500">
                  <p className="text-6xl mb-4">✈️</p>
                  <p className="font-bold text-lg text-slate-300">Select or Create an Itinerary</p>
                  <p className="text-sm text-slate-500 max-w-sm mt-2">
                    Generate a new detailed day-by-day vacation timeline and custom packing checklist with AI.
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-2xl transition"
                  >
                    Get Started Now
                  </button>
                </div>
              )
            )}

            {showCreateForm && (
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-500 min-h-[350px]">
                <p className="text-4xl mb-3">👈</p>
                <p className="text-sm font-semibold">Creating a new itinerary...</p>
                <p className="text-xs mt-1">Please enter your preferences in the sidebar form.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-slate-700 text-xs py-8 border-t border-slate-900 mt-12">
        <p>Trao AI Travel Planner &copy; {new Date().getFullYear()} • Dynamic Itineraries & Weather packing assistant</p>
      </footer>
    </div>
  );
}
