import React, { useState } from 'react';
import { Trip, Activity, ItineraryDay } from '../types';

interface ItineraryCardProps {
  trip: Trip;
  onUpdateTrip?: (updatedTrip: Trip) => void;
  onRegenerateDay?: (dayNumber: number, instructions: string) => Promise<void>;
  isReadOnly?: boolean;
}

export default function ItineraryCard({ trip, onUpdateTrip, onRegenerateDay, isReadOnly = false }: ItineraryCardProps) {
  // Activity Inline Form state
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [newActivityCost, setNewActivityCost] = useState(0);
  const [newActivityTime, setNewActivityTime] = useState('Morning');
  const [activeAddDay, setActiveAddDay] = useState<number | null>(null);

  // Regeneration state
  const [regenInstructions, setRegenInstructions] = useState('');
  const [activeRegenDay, setActiveRegenDay] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Activity Edit state
  const [activeEditDay, setActiveEditDay] = useState<number | null>(null);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [editActivityTitle, setEditActivityTitle] = useState('');
  const [editActivityDesc, setEditActivityDesc] = useState('');
  const [editActivityCost, setEditActivityCost] = useState(0);
  const [editActivityTime, setEditActivityTime] = useState('Morning');

  // Add activity handler
  const handleAddActivity = async (dayNumber: number) => {
    if (!newActivityTitle.trim()) return;

    const newAct: Activity = {
      title: newActivityTitle.trim(),
      description: newActivityDesc.trim() || 'Added by traveler',
      estimatedCostUSD: Math.max(0, newActivityCost),
      timeOfDay: newActivityTime,
    };

    const updatedItinerary = trip.itinerary.map((day) => {
      if (day.dayNumber === dayNumber) {
        return {
          ...day,
          activities: [...day.activities, newAct],
        };
      }
      return day;
    });

    // Recompute total activities budget
    let sumActivities = 0;
    updatedItinerary.forEach((d) => {
      d.activities.forEach((a) => {
        sumActivities += a.estimatedCostUSD || 0;
      });
    });

    const updatedBudget = {
      ...trip.estimatedBudget,
      activities: sumActivities,
      total: trip.estimatedBudget.transport + trip.estimatedBudget.accommodation + trip.estimatedBudget.food + sumActivities,
    };

    // Update locally and API
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/trips/${trip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ itinerary: updatedItinerary, estimatedBudget: updatedBudget }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        onUpdateTrip(updatedData);
        // Reset form
        setNewActivityTitle('');
        setNewActivityDesc('');
        setNewActivityCost(0);
        setNewActivityTime('Morning');
        setActiveAddDay(null);
      }
    } catch (err) {
      console.error('Failed to add activity:', err);
    }
  };

  // Remove activity handler
  const handleRemoveActivity = async (dayNumber: number, actIndex: number) => {
    const updatedItinerary = trip.itinerary.map((day) => {
      if (day.dayNumber === dayNumber) {
        const copyActs = [...day.activities];
        copyActs.splice(actIndex, 1);
        return {
          ...day,
          activities: copyActs,
        };
      }
      return day;
    });

    let sumActivities = 0;
    updatedItinerary.forEach((d) => {
      d.activities.forEach((a) => {
        sumActivities += a.estimatedCostUSD || 0;
      });
    });

    const updatedBudget = {
      ...trip.estimatedBudget,
      activities: sumActivities,
      total: trip.estimatedBudget.transport + trip.estimatedBudget.accommodation + trip.estimatedBudget.food + sumActivities,
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/trips/${trip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ itinerary: updatedItinerary, estimatedBudget: updatedBudget }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        onUpdateTrip(updatedData);
      }
    } catch (err) {
      console.error('Failed to remove activity:', err);
    }
  };

  // Regeneration triggers
  const handleRegenSubmit = async (dayNumber: number) => {
    if (!regenInstructions.trim()) return;
    setIsRegenerating(true);
    try {
      await onRegenerateDay(dayNumber, regenInstructions);
      setRegenInstructions('');
      setActiveRegenDay(null);
    } catch (error) {
      console.error('Failed to regenerate day:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Start Editing Handler
  const handleStartEdit = (dayNumber: number, index: number, act: Activity) => {
    setActiveEditDay(dayNumber);
    setActiveEditIndex(index);
    setEditActivityTitle(act.title);
    setEditActivityDesc(act.description || '');
    setEditActivityCost(act.estimatedCostUSD);
    setEditActivityTime(act.timeOfDay);
    setActiveAddDay(null);
    setActiveRegenDay(null);
  };

  // Save Editing Handler
  const handleSaveEdit = async () => {
    if (activeEditDay === null || activeEditIndex === null || !editActivityTitle.trim()) return;

    const updatedItinerary = trip.itinerary.map((day) => {
      if (day.dayNumber === activeEditDay) {
        const copyActs = [...day.activities];
        copyActs[activeEditIndex] = {
          title: editActivityTitle.trim(),
          description: editActivityDesc.trim() || 'Updated by traveler',
          estimatedCostUSD: Math.max(0, editActivityCost),
          timeOfDay: editActivityTime,
        };
        return {
          ...day,
          activities: copyActs,
        };
      }
      return day;
    });

    let sumActivities = 0;
    updatedItinerary.forEach((d) => {
      d.activities.forEach((a) => {
        sumActivities += a.estimatedCostUSD || 0;
      });
    });

    const updatedBudget = {
      ...trip.estimatedBudget,
      activities: sumActivities,
      total: trip.estimatedBudget.transport + trip.estimatedBudget.accommodation + trip.estimatedBudget.food + sumActivities,
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/trips/${trip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ itinerary: updatedItinerary, estimatedBudget: updatedBudget }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        onUpdateTrip(updatedData);
        setActiveEditDay(null);
        setActiveEditIndex(null);
      }
    } catch (err) {
      console.error('Failed to save activity edit:', err);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🗺️ Day-by-Day Timeline</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">Explore and edit your planned itinerary for {trip.destination}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 transition text-indigo-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 no-print"
        >
          <span>📄 Export PDF</span>
        </button>
      </div>

      <div className="space-y-8 relative">
        {/* Continuous timeline line */}
        <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-500" />

        {trip.itinerary.map((day) => (
          <div key={day.dayNumber} className="relative pl-10 md:pl-12 group">
            {/* Timeline node */}
            <div className="absolute left-0 top-1.5 w-7 h-7 bg-slate-900 border-2 border-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-indigo-400 shadow-md group-hover:border-purple-500 transition duration-300">
              {day.dayNumber}
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>Day {day.dayNumber}</span>
              </h3>
              
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveAddDay(activeAddDay === day.dayNumber ? null : day.dayNumber);
                      setActiveRegenDay(null);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 transition duration-200 flex items-center gap-1"
                  >
                    <span>➕ Add Activity</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveRegenDay(activeRegenDay === day.dayNumber ? null : day.dayNumber);
                      setActiveAddDay(null);
                    }}
                    className="bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-900/50 transition duration-200 flex items-center gap-1"
                  >
                    <span>✨ AI Modify</span>
                  </button>
                </div>
              )}
            </div>

            {/* Regeneration Pane */}
            {activeRegenDay === day.dayNumber && (
              <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 mb-4 animate-fadeIn">
                <p className="text-xs font-semibold text-indigo-400 mb-2">AI Modify Request (Day {day.dayNumber})</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Change this day to have outdoor hiking and mountain views instead"
                    value={regenInstructions}
                    onChange={(e) => setRegenInstructions(e.target.value)}
                    disabled={isRegenerating}
                    className="flex-1 bg-slate-950/80 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRegenSubmit(day.dayNumber)}
                      disabled={isRegenerating || !regenInstructions.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition duration-200 flex items-center gap-1"
                    >
                      {isRegenerating ? 'Working...' : 'Regenerate'}
                    </button>
                    <button
                      onClick={() => {
                        setActiveRegenDay(null);
                        setRegenInstructions('');
                      }}
                      disabled={isRegenerating}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-3 py-2 rounded-xl border border-slate-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Activity Form */}
            {activeAddDay === day.dayNumber && (
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 mb-4 animate-fadeIn space-y-3">
                <p className="text-xs font-semibold text-slate-300">Add Activity to Day {day.dayNumber}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Activity title..."
                    value={newActivityTitle}
                    onChange={(e) => setNewActivityTitle(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Short description..."
                    value={newActivityDesc}
                    onChange={(e) => setNewActivityDesc(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1">
                    <span className="text-slate-500 text-xs mr-2">$</span>
                    <input
                      type="number"
                      placeholder="Cost (USD)"
                      value={newActivityCost || ''}
                      onChange={(e) => setNewActivityCost(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent w-full text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <select
                    value={newActivityTime}
                    onChange={(e) => setNewActivityTime(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleAddActivity(day.dayNumber)}
                    disabled={!newActivityTitle.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition duration-200"
                  >
                    Save Activity
                  </button>
                  <button
                    onClick={() => setActiveAddDay(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-3 py-2 rounded-xl border border-slate-700 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Activities List */}
            {day.activities.length === 0 ? (
              <div className="bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl p-4 text-center text-slate-500 text-xs">
                No items scheduled. Add an activity to begin!
              </div>
            ) : (
              <div className="space-y-3">
                {day.activities.map((act, index) => {
                  const isEditing = activeEditDay === day.dayNumber && activeEditIndex === index;
                  return isEditing ? (
                    <div key={index} className="bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-4 space-y-3 w-full animate-fadeIn no-print">
                      <p className="text-xs font-semibold text-indigo-400">Edit Activity Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editActivityTitle}
                          onChange={(e) => setEditActivityTitle(e.target.value)}
                          className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                          placeholder="Title..."
                        />
                        <input
                          type="text"
                          value={editActivityDesc}
                          onChange={(e) => setEditActivityDesc(e.target.value)}
                          className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                          placeholder="Description..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center bg-slate-900 border border-slate-850 rounded-xl px-3 py-1">
                          <span className="text-slate-500 text-xs mr-2">$</span>
                          <input
                            type="number"
                            value={editActivityCost || ''}
                            onChange={(e) => setEditActivityCost(Math.max(0, parseInt(e.target.value) || 0))}
                            className="bg-transparent w-full text-xs text-slate-200 focus:outline-none"
                            placeholder="Cost"
                          />
                        </div>
                        <select
                          value={editActivityTime}
                          onChange={(e) => setEditActivityTime(e.target.value)}
                          className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="Morning">Morning</option>
                          <option value="Afternoon">Afternoon</option>
                          <option value="Evening">Evening</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editActivityTitle.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition duration-200"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setActiveEditDay(null);
                            setActiveEditIndex(null);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-3 py-2 rounded-xl border border-slate-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={index}
                      className="bg-slate-950/40 hover:bg-slate-950/60 border border-slate-850 rounded-2xl p-4 flex gap-4 items-start transition-all duration-300 group/item"
                    >
                      {/* Time Indicator icon */}
                      <div className="mt-0.5">
                        {act.timeOfDay === 'Morning' && <span className="text-amber-400 text-lg">☀️</span>}
                        {act.timeOfDay === 'Afternoon' && <span className="text-orange-400 text-lg">🌤️</span>}
                        {act.timeOfDay === 'Evening' && <span className="text-indigo-400 text-lg">🌙</span>}
                        {!['Morning', 'Afternoon', 'Evening'].includes(act.timeOfDay) && <span className="text-slate-400 text-lg">📍</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-100 text-sm">{act.title}</span>
                          <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono font-medium">
                            {act.timeOfDay}
                          </span>
                          {act.estimatedCostUSD > 0 && (
                            <span className="text-emerald-400 text-xs font-semibold font-mono">
                              ${act.estimatedCostUSD}
                            </span>
                          )}
                        </div>
                        {act.description && (
                          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{act.description}</p>
                        )}
                      </div>

                      {!isReadOnly && (
                        <div className="flex gap-1.5 shrink-0 self-center no-print">
                          <button
                            onClick={() => handleStartEdit(day.dayNumber, index, act)}
                            className="text-slate-500 hover:text-indigo-400 p-2 rounded-xl hover:bg-indigo-500/10 transition-colors duration-250"
                            title="Edit activity"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveActivity(day.dayNumber, index)}
                            className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors duration-250"
                            title="Remove activity"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
