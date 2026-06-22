import React, { useState } from 'react';

interface CreateTripFormProps {
  onSubmit: (data: {
    destination: string;
    durationDays: number;
    budgetTier: string;
    interests: string[];
    source: string;
    transportMode: string;
  }) => void;
  isLoading: boolean;
}

const INTEREST_OPTIONS = [
  { id: 'Food', label: 'Culinary & Food', emoji: '🍳' },
  { id: 'Culture', label: 'History & Culture', emoji: '🏛️' },
  { id: 'Adventure', label: 'Outdoor Adventure', emoji: '⛰️' },
  { id: 'Shopping', label: 'Bazaars & Shopping', emoji: '🛍️' },
];

export default function CreateTripForm({ onSubmit, isLoading }: CreateTripFormProps) {
  const [destination, setDestination] = useState('');
  const [source, setSource] = useState('');
  const [transportMode, setTransportMode] = useState('Flight');
  const [durationDays, setDurationDays] = useState<number | ''>(3);
  const [budgetTier, setBudgetTier] = useState('Medium');
  const [interests, setInterests] = useState<string[]>([]);

  const handleInterestToggle = (interestId: string) => {
    if (interests.includes(interestId)) {
      setInterests(interests.filter((i) => i !== interestId));
    } else {
      setInterests([...interests, interestId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;
    const finalDays = typeof durationDays === 'number' ? Math.max(1, durationDays) : 3;
    onSubmit({
      destination,
      durationDays: finalDays,
      budgetTier,
      interests,
      source,
      transportMode,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 relative z-10 mt-2">
      <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
        Generate AI Itinerary
      </h3>

      <div className="space-y-5">
        {/* Destination */}
        <div>
          <label htmlFor="destination" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Where do you want to go?
          </label>
          <input
            id="destination"
            type="text"
            required
            placeholder="e.g., Tokyo, Paris, Rome"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-300 text-sm"
          />
        </div>

        {/* Starting Location (Source) */}
        <div>
          <label htmlFor="source" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Starting Location (Source)
          </label>
          <input
            id="source"
            type="text"
            placeholder="e.g., London, New York, Delhi (Optional)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-300 text-sm"
          />
        </div>

        {/* Transport Preference */}
        <div>
          <label htmlFor="transportMode" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Transport Preference
          </label>
          <div className="relative">
            <select
              id="transportMode"
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-300 text-sm appearance-none cursor-pointer"
            >
              <option value="Flight" className="bg-slate-900 text-slate-100">✈️ Flight</option>
              <option value="Train" className="bg-slate-900 text-slate-100">🚆 Train</option>
              <option value="Driving" className="bg-slate-900 text-slate-100">🚗 Driving</option>
              <option value="Bus" className="bg-slate-900 text-slate-100">🚌 Bus</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="durationDays" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Trip Duration (Days)
          </label>
          <input
            id="durationDays"
            type="number"
            min={1}
            max={30}
            required
            value={durationDays}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setDurationDays('');
              } else {
                const num = parseInt(val, 10);
                if (!isNaN(num)) {
                  setDurationDays(num);
                }
              }
            }}
            onBlur={() => {
              if (durationDays === '' || durationDays < 1) {
                setDurationDays(3);
              }
            }}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-300 text-sm"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Budget Profile
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Low', 'Medium', 'High'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setBudgetTier(tier)}
                className={`py-2.5 rounded-xl border text-xs font-semibold transition-all duration-300 ${
                  budgetTier === tier
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            Select Your Interests
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {INTEREST_OPTIONS.map((opt) => {
              const isSelected = interests.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleInterestToggle(opt.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all duration-300 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/5'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-lg shrink-0">{opt.emoji}</span>
                  <span className="text-xs font-medium truncate sm:not-truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-xl hover:shadow-indigo-500/25 transition duration-300 flex items-center justify-center gap-2 mt-2 text-sm"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Consulting Travel Agent...
            </>
          ) : (
            <>
              <span>Generate Dream Trip</span>
              <span className="text-base">✈️</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
