import React from 'react';
import { Trip, PackingItem } from '../types';

interface PackingListProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

const CATEGORIES = ['Documents', 'Clothing', 'Gear', 'Other'];

export default function PackingList({ trip, onUpdateTrip }: PackingListProps) {
  
  const handleToggleItem = async (itemId: string) => {
    const updatedPackingList = trip.packingList.map((item) => {
      if (item._id === itemId) {
        return {
          ...item,
          isPacked: !item.isPacked,
        };
      }
      return item;
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/trips/${trip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packingList: updatedPackingList }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        onUpdateTrip(updatedData);
      }
    } catch (err) {
      console.error('Failed to toggle packing item:', err);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Documents':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Clothing':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Gear':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
      <div className="border-b border-slate-800 pb-4 mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>⛈️ AI Weather Packing Assistant</span>
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          Smart checklists generated dynamically by AI for climate conditions in {trip.destination}
        </p>
      </div>

      <div className="space-y-6">
        {CATEGORIES.map((category) => {
          const categoryItems = trip.packingList.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                {category}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryItems.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleToggleItem(item._id!)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition duration-300 w-full hover:bg-slate-800/40 select-none ${
                      item.isPacked
                        ? 'bg-slate-950/20 border-slate-900 text-slate-500'
                        : 'bg-slate-950/40 border-slate-800 text-slate-200'
                    }`}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-300 ${
                        item.isPacked
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {item.isPacked && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <span className={`text-sm ${item.isPacked ? 'line-through' : ''}`}>
                      {item.item}
                    </span>

                    {/* Mini Category tag */}
                    <span className={`ml-auto text-[10px] px-2 py-0.5 border rounded-full font-mono font-medium ${getCategoryColor(category)}`}>
                      {category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {trip.packingList.length === 0 && (
          <p className="text-slate-500 text-sm text-center">No packing recommendations available.</p>
        )}
      </div>
    </div>
  );
}
