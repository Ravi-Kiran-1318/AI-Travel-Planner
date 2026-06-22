'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import { Trip } from '../../types';
import CreateTripForm from '../../components/CreateTripForm';
import ItineraryCard from '../../components/ItineraryCard';
import PackingList from '../../components/PackingList';

export default function DashboardPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Authenticate user & load trips
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadTrips();
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
    try {
      const updatedTrip = await api.trips.regenerateDay(selectedTrip._id, dayNumber, instructions);
      handleUpdateTripState(updatedTrip);
    } catch (err: any) {
      console.error('Failed to regenerate day:', err);
      alert(err.message || 'Error occurred during day regeneration. Please retry.');
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip itinerary?')) return;
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
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-slate-900 pb-5 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              AI Travel Planner
            </h1>
            <p className="text-xs text-slate-500 mt-1">Logged in • Enforced User Isolation Enclave</p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 transition text-red-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            Sign Out
          </button>
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
                <h3 className="text-lg font-bold text-white">Financial Cost Ledger</h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Transport & Transit:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      ${selectedTrip.estimatedBudget?.transport || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Lodging & Hotels:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      ${selectedTrip.estimatedBudget?.accommodation || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Culinary & Food:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      ${selectedTrip.estimatedBudget?.food || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Activities Booking:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      ${selectedTrip.estimatedBudget?.activities || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-800 pt-4 text-white font-bold">
                    <span className="text-indigo-400">Grand Estimated Total:</span>
                    <span className="font-mono text-indigo-400 text-lg">
                      ${selectedTrip.estimatedBudget?.total || 0}
                    </span>
                  </div>
                </div>
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
                            ${hotel.estimatedCostNightUSD}/night
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
