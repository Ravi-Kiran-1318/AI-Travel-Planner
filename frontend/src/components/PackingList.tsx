import React, { useState } from 'react';
import { Trip, PackingItem } from '../types';

interface PackingListProps {
  trip: Trip;
  onUpdateTrip?: (updatedTrip: Trip) => void;
  isReadOnly?: boolean;
}

const CATEGORIES = ['Documents', 'Clothing', 'Gear', 'Other'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PackingList({ trip, onUpdateTrip, isReadOnly = false }: PackingListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState('Other');
  const [isAdding, setIsAdding] = useState(false);

  const handleToggleItem = async (itemId: string) => {
    if (isReadOnly || !onUpdateTrip) return;
    
    const updatedPackingList = trip.packingList.map((item) => {
      if (item._id === itemId) {
        return { ...item, isPacked: !item.isPacked };
      }
      return item;
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/trips/${trip._id}`, {
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

  const handleAddCustomItem = async () => {
    if (!newItem.trim() || isAdding) return;
    setIsAdding(true);
    const customItem: PackingItem = {
      item: newItem.trim(),
      category: newCategory,
      isPacked: false,
    };
    const updatedPackingList = [...trip.packingList, customItem];

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/trips/${trip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packingList: updatedPackingList }),
      });
      if (res.ok) {
        const updatedData = await res.json();
        if (onUpdateTrip) onUpdateTrip(updatedData);
        setNewItem('');
        setNewCategory('Other');
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Failed to add custom packing item:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Documents': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Clothing': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Gear': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const packedCount = trip.packingList.filter(i => i.isPacked).length;
  const totalCount = trip.packingList.length;
  const progressPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
      <div className="border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>⛈️ AI Weather Packing Assistant</span>
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Smart checklists generated dynamically by AI for climate conditions in {trip.destination}
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition duration-200 flex items-center gap-1.5 no-print"
            >
              <span>➕ Add Item</span>
            </button>
          )}
        </div>

        {/* Packing Progress Bar */}
        {totalCount > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Packing Progress</span>
              <span className={`font-semibold ${progressPercent === 100 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {packedCount}/{totalCount} packed {progressPercent === 100 ? '🎉' : ''}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Item Form */}
      {showAddForm && !isReadOnly && (
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
          <p className="text-xs font-semibold text-slate-300">Add Personal Packing Item</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., Prescription medication, Travel pillow..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 shrink-0"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleAddCustomItem}
              disabled={!newItem.trim() || isAdding}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              {isAdding ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding...</span>
                </>
              ) : 'Save Item'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewItem(''); }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-3 py-2 rounded-xl border border-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {CATEGORIES.map((category) => {
          const categoryItems = trip.packingList.filter((item) => item.category === category);

          return (
            <div key={category} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 shadow-lg w-full">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  {category}
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${getCategoryColor(category)}`}>
                  {categoryItems.length} items
                </span>
              </div>
              
              <div className={categoryItems.length === 0 ? "flex items-center justify-center py-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"}>
                {categoryItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No items yet</p>
                ) : (
                  categoryItems.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => !isReadOnly && handleToggleItem(item._id!)}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border text-left transition duration-300 w-full ${
                        !isReadOnly ? 'hover:bg-slate-800/60 cursor-pointer select-none' : 'select-none'
                      } ${
                        item.isPacked
                          ? 'bg-slate-900/30 border-slate-800/50 text-slate-500'
                          : 'bg-slate-800/20 border-slate-700/50 text-slate-200'
                      }`}
                    >
                      <div
                        className={`mt-0.5 shrink-0 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all duration-300 ${
                          item.isPacked
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'border-slate-600 bg-slate-900/50'
                        }`}
                      >
                        {item.isPacked && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs leading-snug flex-1 ${item.isPacked ? 'line-through' : ''}`}>
                        {item.item}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {trip.packingList.length === 0 && (
          <p className="text-slate-500 text-sm text-center bg-slate-950/20 p-8 rounded-2xl border border-slate-800 border-dashed">No packing recommendations available.</p>
        )}
      </div>
    </div>
  );
}
