'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trip } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TripCopilotProps {
  trip: Trip;
  currency?: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Dynamic prompts based on trip interests
function buildQuickPrompts(trip: Trip): string[] {
  const prompts = [
    `🍽️ Best food in ${trip.destination}?`,
    `💰 Breakdown my $${trip.estimatedBudget?.total || 0} budget`,
    `🚌 How to get around ${trip.destination}?`,
    `🌤️ What's the weather like there?`,
    `🎒 What should I pack?`,
    `📍 Hidden gems & local tips`,
  ];
  // Add interest-specific prompt if available
  if (trip.interests?.includes('adventure')) prompts.unshift(`🏔️ Best outdoor adventures?`);
  if (trip.interests?.includes('culture')) prompts.unshift(`🏛️ Top cultural attractions?`);
  if (trip.interests?.includes('shopping')) prompts.unshift(`🛍️ Best shopping spots?`);
  return prompts.slice(0, 5);
}

// Rich markdown-like content formatter
function formatContent(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-300 font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>')
    // Bullet list items starting with "- "
    .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 items-start mt-1"><span class="text-indigo-500 shrink-0">•</span><span>$1</span></div>')
    // Numbered items "1. "
    .replace(/^\d+\. (.+)$/gm, '<div class="flex gap-1.5 items-start mt-1 ml-1"><span class="text-purple-400 shrink-0 font-mono text-[9px] mt-0.5">▶</span><span>$1</span></div>')
    // Line breaks
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, '<br/>');
}

export default function TripCopilot({ trip, currency = 'USD' }: TripCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hey! I'm your AI Trip Co-pilot for **${trip.destination}** 🗺️\n\nI know your full **${trip.durationDays}-day** itinerary, **${trip.budgetTier}** budget (~$${trip.estimatedBudget?.total || 0} USD), hotels, and packing list.\n\nAsk me anything or pick a quick question below!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickPrompts = buildQuickPrompts(trip);

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setShowQuickPrompts(false);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/trips/${trip._id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error ${res.status}`);
      }
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply || 'I got your message! Feel free to ask more about your trip. 😊',
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error('[TripCopilot] Error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Something went wrong on my end. But here's what I know: your **${trip.durationDays}-day ${trip.destination}** trip has a **${trip.budgetTier}** budget of ~$${trip.estimatedBudget?.total || 0} USD. Try asking me again! 🙏`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClearChat = () => {
    setMessages([{
      id: 'welcome-reset',
      role: 'assistant',
      content: `Chat cleared! Still here to help with your **${trip.destination}** trip. 😊 What would you like to know?`,
      timestamp: new Date(),
    }]);
    setShowQuickPrompts(true);
  };

  return (
    <div
      id="copilot-panel"
      className="w-full bg-slate-950/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-xl flex flex-col overflow-hidden h-[500px] mb-8"
    >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-950/80 to-purple-950/60 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-base shadow-lg">
                🤖
              </div>
              <div>
                <p className="text-sm font-bold text-white">AI Trip Co-pilot</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] text-emerald-400 font-medium">
                    {trip.destination} • {trip.budgetTier} • {trip.durationDays}d
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Clear chat */}
              {messages.length > 1 && (
                <button
                  onClick={handleClearChat}
                  className="text-slate-600 hover:text-slate-400 p-1.5 rounded-lg hover:bg-slate-800/60 transition"
                  title="Clear chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs shrink-0 mb-0.5">
                        🤖
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-bl-sm'
                      }`}
                      dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                    />
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start items-end gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs shrink-0">
                      🤖
                    </div>
                    <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt chips — show on welcome or after toggle */}
              {showQuickPrompts && (
                <div className="px-4 pb-2 border-t border-slate-900/50 pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Quick Questions</p>
                    <button
                      onClick={() => setShowQuickPrompts(false)}
                      className="text-slate-700 hover:text-slate-500 text-[9px]"
                    >
                      hide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPrompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        disabled={isLoading}
                        className="text-[10px] bg-slate-900 border border-slate-800 hover:border-indigo-600/50 hover:bg-indigo-950/30 text-slate-400 hover:text-indigo-300 px-2.5 py-1.5 rounded-xl transition duration-200 disabled:opacity-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show prompts toggle when hidden */}
              {!showQuickPrompts && !isLoading && (
                <div className="px-4 pb-1">
                  <button
                    onClick={() => setShowQuickPrompts(true)}
                    className="text-[9px] text-slate-700 hover:text-slate-500 transition"
                  >
                    💡 Show quick suggestions
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="px-4 py-3 border-t border-slate-900 shrink-0">
                <div className="flex gap-2 items-center bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-2 focus-within:border-indigo-600/50 transition-colors duration-200">
                  <input
                    ref={inputRef}
                    type="text"
                    id="copilot-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder={`Ask about ${trip.destination}...`}
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-1.5 rounded-xl transition duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="text-[9px] text-slate-700 text-center mt-1.5">Powered by Gemini AI • Context-aware responses</p>
              </div>
        </div>
  );
}
