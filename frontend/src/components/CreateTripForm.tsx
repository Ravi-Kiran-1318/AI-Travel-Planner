import React, { useState } from 'react';

interface CreateTripFormProps {
  onSubmit: (data: { destination: string; durationDays: number; budgetTier: string; interests: string[] }) => void;
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
  const [durationDays, setDurationDays] = useState(3);
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
    if (!destination.trim() || durationDays <= 0) return;
    onSubmit({
      destination,
      durationDays,
      budgetTier,
      interests,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative backdrop glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-6">
        Generate AI Itinerary
      </h2>

      <div className="space-y-6 relative z-10">
        {/* Destination */}
        <div>
          <label htmlFor="destination" className="block text-sm font-semibold text-slate-300 mb-2">
            Where do you want to go?
          </label>
          <input
            id="destination"
            type="text"
            required
            placeholder="e.g., Tokyo, Paris, Rome"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-300"
          />
        </div>

        {/* Duration and Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="durationDays" className="block text-sm font-semibold text-slate-300 mb-2">
              Trip Duration (Days)
            </label>
            <input
              id="durationDays"
              type="number"
              min={1}
              max={30}
              required
              value={durationDays}
              onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-300"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Budget Profile
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Low', 'Medium', 'High'].map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setBudgetTier(tier)}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-300 ${
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
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Select Your Interests
          </label>
          <div className="grid grid-cols-2 gap-3">
            {INTEREST_OPTIONS.map((opt) => {
              const isSelected = interests.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleInterestToggle(opt.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-300 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/5'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-xl hover:shadow-indigo-500/25 transition duration-300 flex items-center justify-center gap-2 mt-4"
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
              <span className="text-lg">✈️</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
