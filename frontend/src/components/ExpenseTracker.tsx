'use client';

import React, { useState, useEffect } from 'react';

interface ExpenseTrackerProps {
  tripId: string;
  currency: string;
  estimatedBudget?: {
    transport: number;
    accommodation: number;
    food: number;
    activities: number;
    total: number;
  };
}

interface Expense {
  id: string;
  category: 'Transport' | 'Accommodation' | 'Food' | 'Activities' | 'Other';
  title: string;
  amount: number;
  date: string;
}

const CURRENCIES: Record<string, { symbol: string; rate: number }> = {
  USD: { symbol: '$', rate: 1.0 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  INR: { symbol: '₹', rate: 83.5 },
  JPY: { symbol: '¥', rate: 158.0 },
};

export default function ExpenseTracker({ tripId, currency, estimatedBudget }: ExpenseTrackerProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'USD');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'Food',
    date: new Date().toISOString().split('T')[0]
  });

  // Load from local storage for prototype persistence
  useEffect(() => {
    const saved = localStorage.getItem(`expenses_${tripId}`);
    if (saved) {
      setExpenses(JSON.parse(saved));
    }
  }, [tripId]);

  // Save to local storage whenever expenses change
  useEffect(() => {
    localStorage.setItem(`expenses_${tripId}`, JSON.stringify(expenses));
  }, [expenses, tripId]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount || !newExpense.category || !newExpense.date) return;

    const rate = CURRENCIES[selectedCurrency]?.rate || 1;
    // Store internally as USD
    const amountInUSD = Number(newExpense.amount) / rate;

    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      title: newExpense.title,
      amount: amountInUSD,
      category: newExpense.category as Expense['category'],
      date: newExpense.date
    };

    setExpenses(prev => [expense, ...prev]);
    setShowForm(false);
    setNewExpense({ category: 'Food', date: new Date().toISOString().split('T')[0], title: '', amount: undefined });
  };

  const handleDelete = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const formatAmount = (usdAmount: number) => {
    const rate = CURRENCIES[selectedCurrency]?.rate || 1;
    const converted = usdAmount * rate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(converted);
  };

  const totalsByCategory = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalSpent = expenses.reduce((sum, curr) => sum + curr.amount, 0);
  const estimatedTotal = estimatedBudget?.total || 0;
  const percentageSpent = estimatedTotal > 0 ? Math.min(100, Math.round((totalSpent / estimatedTotal) * 100)) : 0;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>💰 Expense Tracker</span>
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Log your actual spending against the AI generated budget
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
          >
            {Object.keys(CURRENCIES).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-900/20 transition-colors flex items-center gap-2"
          >
            {showForm ? 'Cancel' : '➕ Add Expense'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAddExpense} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 mb-8 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Item / Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Dinner at Luigi's"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                value={newExpense.title || ''}
                onChange={e => setNewExpense({...newExpense, title: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Amount ({selectedCurrency})</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                value={newExpense.amount || ''}
                onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Category</label>
              <select
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value as Expense['category']})}
              >
                <option value="Food">🍔 Food</option>
                <option value="Transport">🚕 Transport</option>
                <option value="Accommodation">🏨 Accommodation</option>
                <option value="Activities">🎟️ Activities</option>
                <option value="Other">🛍️ Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                value={newExpense.date || ''}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md transition">
              Save Expense
            </button>
          </div>
        </form>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Total Spent</p>
          <p className="text-3xl font-bold text-white font-mono">{formatAmount(totalSpent)}</p>
          {estimatedTotal > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                <span>{percentageSpent}% of Budget</span>
                <span>{formatAmount(estimatedTotal)}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${percentageSpent > 90 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${percentageSpent}%` }} 
                />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-slate-950/40 border border-slate-850 p-5 rounded-2xl">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">Spending by Category</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Food', 'Transport', 'Accommodation', 'Activities'].map((cat) => {
              const spent = totalsByCategory[cat] || 0;
              const est = estimatedBudget ? estimatedBudget[cat.toLowerCase() as keyof typeof estimatedBudget] : 0;
              const isOver = est > 0 && spent > est;
              
              return (
                <div key={cat} className="flex flex-col">
                  <span className="text-slate-400 text-xs font-semibold">{cat}</span>
                  <span className="text-white font-mono font-bold">{formatAmount(spent)}</span>
                  {est > 0 && (
                    <span className={`text-[10px] font-medium ${isOver ? 'text-red-400' : 'text-slate-500'}`}>
                      {isOver ? 'Over by ' : 'Under by '}
                      {formatAmount(Math.abs(est - spent))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div>
        <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Recent Transactions</h4>
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-4xl mb-2">💸</p>
            <p>No expenses logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between bg-slate-950/40 hover:bg-slate-900/60 transition border border-slate-850 p-4 rounded-2xl group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-lg shadow-inner">
                    {expense.category === 'Food' && '🍔'}
                    {expense.category === 'Transport' && '🚕'}
                    {expense.category === 'Accommodation' && '🏨'}
                    {expense.category === 'Activities' && '🎟️'}
                    {expense.category === 'Other' && '🛍️'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{expense.title}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{expense.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-mono font-bold text-slate-200">{formatAmount(expense.amount)}</p>
                  <button 
                    onClick={() => handleDelete(expense.id)}
                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
