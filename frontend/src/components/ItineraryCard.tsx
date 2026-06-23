import React, { useState } from 'react';
import { Trip, Activity, ItineraryDay } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ItineraryCardProps {
  trip: Trip;
  onUpdateTrip?: (updatedTrip: Trip) => void;
  onRegenerateDay?: (dayNumber: number, instructions: string) => Promise<void>;
  isReadOnly?: boolean;
  currency?: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY';
}

const CURRENCIES = {
  USD: { symbol: '$', rate: 1.0 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  INR: { symbol: '₹', rate: 83.5 },
  JPY: { symbol: '¥', rate: 158.0 },
};

export default function ItineraryCard({ trip, onUpdateTrip, onRegenerateDay, isReadOnly = false, currency = 'USD' }: ItineraryCardProps) {
  const { symbol: currencySymbol, rate: currencyRate } = CURRENCIES[currency];

  const formatAmount = (usdValue: number) => {
    return `${currencySymbol}${(usdValue * currencyRate).toFixed(0)}`;
  };

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

  // Loading States for Actions
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRemovingIndex, setIsRemovingIndex] = useState<{ day: number; index: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (dayNumber: number, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeIndex = parseInt(active.id.toString().split('-').pop() || '0', 10);
      const overIndex = parseInt(over.id.toString().split('-').pop() || '0', 10);

      const updatedItinerary = trip.itinerary.map(day => {
        if (day.dayNumber === dayNumber) {
          const acts = [...day.activities];
          const [moved] = acts.splice(activeIndex, 1);
          acts.splice(overIndex, 0, moved);
          return { ...day, activities: acts };
        }
        return day;
      });

      if (onUpdateTrip) onUpdateTrip({ ...trip, itinerary: updatedItinerary });
      
      try {
        const token = localStorage.getItem('token');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/trips/${trip._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ itinerary: updatedItinerary }),
        });
      } catch (err) {
         console.error('Reorder error', err);
      }
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('itinerary-pdf-container');
    if (!element) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f172a', // slate-950
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Fill first page background
      pdf.setFillColor(15, 23, 42); // #0f172a (slate-950)
      pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight; // negative offset to move the image up
        pdf.addPage();
        // Fill new page background
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Itinerary_${trip.destination.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Add activity handler
  const handleAddActivity = async (dayNumber: number) => {
    if (!newActivityTitle.trim()) return;
    setIsAdding(true);

    const newAct: Activity = {
      title: newActivityTitle.trim(),
      description: newActivityDesc.trim() || 'Added by traveler',
      estimatedCostUSD: Math.max(0, Math.round(newActivityCost / currencyRate)),
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
        if (onUpdateTrip) onUpdateTrip(updatedData);
        // Reset form
        setNewActivityTitle('');
        setNewActivityDesc('');
        setNewActivityCost(0);
        setNewActivityTime('Morning');
        setActiveAddDay(null);
      }
    } catch (err) {
      console.error('Failed to add activity:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Remove activity handler
  const handleRemoveActivity = async (dayNumber: number, actIndex: number) => {
    setIsRemovingIndex({ day: dayNumber, index: actIndex });
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
        if (onUpdateTrip) onUpdateTrip(updatedData);
      }
    } catch (err) {
      console.error('Failed to remove activity:', err);
    } finally {
      setIsRemovingIndex(null);
    }
  };

  // Regeneration triggers
  const handleRegenSubmit = async (dayNumber: number) => {
    if (!regenInstructions.trim()) return;
    setIsRegenerating(true);
    try {
      if (onRegenerateDay) await onRegenerateDay(dayNumber, regenInstructions);
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
    setEditActivityCost(Math.round(act.estimatedCostUSD * currencyRate));
    setEditActivityTime(act.timeOfDay);
    setActiveAddDay(null);
    setActiveRegenDay(null);
  };

  // Save Editing Handler
  const handleSaveEdit = async () => {
    if (activeEditDay === null || activeEditIndex === null || !editActivityTitle.trim()) return;
    setIsSavingEdit(true);

    const updatedItinerary = trip.itinerary.map((day) => {
      if (day.dayNumber === activeEditDay) {
        const copyActs = [...day.activities];
        copyActs[activeEditIndex] = {
          title: editActivityTitle.trim(),
          description: editActivityDesc.trim() || 'Updated by traveler',
          estimatedCostUSD: Math.max(0, Math.round(editActivityCost / currencyRate)),
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
        if (onUpdateTrip) onUpdateTrip(updatedData);
        setActiveEditDay(null);
        setActiveEditIndex(null);
      }
    } catch (err) {
      console.error('Failed to save activity edit:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div id="itinerary-pdf-container" className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🗺️ Day-by-Day Timeline</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">Explore and edit your planned itinerary for {trip.destination}</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 transition text-indigo-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 no-print disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <span>📄 Export PDF</span>
          )}
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
                    <span className="text-slate-500 text-xs mr-2">{currencySymbol}</span>
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
                    disabled={!newActivityTitle.trim() || isAdding}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition duration-200 flex items-center gap-1.5"
                  >
                    {isAdding ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      'Save Activity'
                    )}
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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(day.dayNumber, e)}>
                  <SortableContext items={day.activities.map((_, i) => `day${day.dayNumber}-act${i}`)} strategy={verticalListSortingStrategy}>
                    {day.activities.map((act, index) => {
                      const isEditing = activeEditDay === day.dayNumber && activeEditIndex === index;
                      const actId = `day${day.dayNumber}-act${index}`;
                      return isEditing ? (
                        <div key={actId} className="bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-4 space-y-3 w-full animate-fadeIn no-print mb-3">
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
                              <span className="text-slate-500 text-xs mr-2">{currencySymbol}</span>
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
                              disabled={!editActivityTitle.trim() || isSavingEdit}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition duration-200 flex items-center gap-1.5"
                            >
                              {isSavingEdit ? 'Saving...' : 'Save Changes'}
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
                        <SortableActivityItem
                          key={actId}
                          id={actId}
                          act={act}
                          dayNumber={day.dayNumber}
                          index={index}
                          currencySymbol={currencySymbol}
                          formatAmount={formatAmount}
                          isReadOnly={isReadOnly}
                          isRemovingIndex={isRemovingIndex}
                          handleStartEdit={handleStartEdit}
                          handleRemoveActivity={handleRemoveActivity}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>              </div>
            )}
          </div>
        ))}

        {/* Trip Completed Marker */}
        <div className="relative pl-10 md:pl-12 pt-2 flex items-center group">
          <div className="absolute left-0 w-7 h-7 bg-slate-900 border-2 border-emerald-500 rounded-full flex items-center justify-center text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] z-10">
            🏁
          </div>
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl px-4 py-2.5 flex items-center gap-3 w-full sm:w-auto mt-1">
            <span className="text-emerald-400 font-bold text-sm">Trip Finished!</span>
            <div className="w-px h-4 bg-emerald-900/50 hidden sm:block"></div>
            <span className="text-slate-400 text-xs">Safe travels & have a great time! ✨</span>
          </div>
        </div>
      </div>
    </div>
  );
}


interface SortableActivityItemProps {
  id: string;
  act: Activity;
  dayNumber: number;
  index: number;
  currencySymbol: string;
  formatAmount: (val: number) => string;
  isReadOnly: boolean;
  isRemovingIndex: { day: number; index: number } | null;
  handleStartEdit: (d: number, i: number, a: Activity) => void;
  handleRemoveActivity: (d: number, i: number) => void;
}

function SortableActivityItem({ id, act, dayNumber, index, currencySymbol, formatAmount, isReadOnly, isRemovingIndex, handleStartEdit, handleRemoveActivity }: SortableActivityItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-950/40 hover:bg-slate-950/60 border border-slate-850 rounded-2xl p-4 flex gap-4 items-start transition-colors duration-300 group/item mb-3 ${isDragging ? 'shadow-2xl border-indigo-500/50 bg-slate-900/80' : ''}`}
    >
      {/* Drag Handle */}
      {!isReadOnly && (
        <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-slate-600 hover:text-indigo-400 no-print flex items-center justify-center -ml-2 mr-[-8px] transition">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>
        </div>
      )}

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
              {formatAmount(act.estimatedCostUSD)}
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
            onClick={() => handleStartEdit(dayNumber, index, act)}
            className="text-slate-500 hover:text-indigo-400 p-2 rounded-xl hover:bg-indigo-500/10 transition-colors duration-250"
            title="Edit activity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => handleRemoveActivity(dayNumber, index)}
            disabled={isRemovingIndex?.day === dayNumber && isRemovingIndex?.index === index}
            className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors duration-250 flex items-center justify-center min-w-[36px] min-h-[36px]"
            title="Remove activity"
          >
            {isRemovingIndex?.day === dayNumber && isRemovingIndex?.index === index ? (
              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
