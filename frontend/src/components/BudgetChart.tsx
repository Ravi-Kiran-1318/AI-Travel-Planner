'use client';

import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { EstimatedBudget } from '../types';

interface BudgetChartProps {
  budget: EstimatedBudget;
  currency?: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY';
}

const CURRENCIES = {
  USD: { symbol: '$', rate: 1.0 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  INR: { symbol: '₹', rate: 83.5 },
  JPY: { symbol: '¥', rate: 158.0 },
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];
const CHART_LABELS = ['Transport', 'Accommodation', 'Food', 'Activities'];

type ChartView = 'pie' | 'bar';

const CustomTooltip = ({ active, payload, currencySymbol, currencyRate }: any) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-slate-300 text-xs font-semibold">{name}</p>
        <p className="text-indigo-400 text-sm font-bold mt-1">
          {currencySymbol}{(value * currencyRate).toFixed(0)}
        </p>
      </div>
    );
  }
  return null;
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function BudgetChart({ budget, currency = 'USD' }: BudgetChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('pie');
  const { symbol: currencySymbol, rate: currencyRate } = CURRENCIES[currency];

  const rawData = [
    { name: 'Transport', value: budget.transport || 0 },
    { name: 'Accommodation', value: budget.accommodation || 0 },
    { name: 'Food', value: budget.food || 0 },
    { name: 'Activities', value: budget.activities || 0 },
  ].filter(d => d.value > 0);

  const totalFormatted = `${currencySymbol}${((budget.total || 0) * currencyRate).toFixed(0)}`;

  if (rawData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Toggle Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveView('pie')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-200 ${
            activeView === 'pie'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          <span>🥧</span> Pie
        </button>
        <button
          onClick={() => setActiveView('bar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-200 ${
            activeView === 'bar'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          <span>📊</span> Bar
        </button>
      </div>

      {/* Pie Chart */}
      {activeView === 'pie' && (
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={rawData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={<CustomPieLabel />}
              >
                {rawData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip currencySymbol={currencySymbol} currencyRate={currencyRate} />}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-500 font-medium">Total</span>
            <span className="text-base font-extrabold text-indigo-400">{totalFormatted}</span>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {rawData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-xs text-slate-400 truncate">{entry.name}</span>
                <span className="text-xs text-slate-300 font-mono font-semibold ml-auto">
                  {currencySymbol}{(entry.value * currencyRate).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {activeView === 'bar' && (
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rawData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${currencySymbol}${(v * currencyRate).toFixed(0)}`}
                tick={{ fill: '#64748b', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip
                content={<CustomTooltip currencySymbol={currencySymbol} currencyRate={currencyRate} />}
                cursor={{ fill: 'rgba(99,102,241,0.08)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {rawData.map((_, index) => (
                  <Cell
                    key={`bar-cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
