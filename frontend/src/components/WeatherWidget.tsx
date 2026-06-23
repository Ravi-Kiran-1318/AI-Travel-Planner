'use client';

import React, { useState, useEffect } from 'react';

interface WeatherWidgetProps {
  destination: string;
}

interface DailyWeather {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

const getWeatherDetails = (code: number) => {
  if (code === 0) return { icon: '☀️', text: 'Clear sky' };
  if ([1, 2, 3].includes(code)) return { icon: '⛅', text: 'Partly cloudy' };
  if ([45, 48].includes(code)) return { icon: '🌫️', text: 'Fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: '🌧️', text: 'Drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '🌧️', text: 'Rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄️', text: 'Snow' };
  if ([95, 96, 99].includes(code)) return { icon: '⛈️', text: 'Thunderstorm' };
  return { icon: '🌈', text: 'Unknown' };
};

export default function WeatherWidget({ destination }: WeatherWidgetProps) {
  const [forecast, setForecast] = useState<DailyWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Geocode the destination using Open-Meteo Geocoding API
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        
        if (!geoData || !geoData.results || geoData.results.length === 0) {
          throw new Error('Location not found');
        }
        
        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;
        
        // 2. Fetch Weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherRes.json();
        
        if (weatherData.daily && isMounted) {
          setForecast(weatherData.daily);
        } else if (isMounted) {
          throw new Error('No weather data available');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWeather();
    
    return () => {
      isMounted = false;
    };
  }, [destination]);

  if (loading) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-center h-[180px]">
        <div className="flex flex-col items-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-500">Fetching 7-day forecast...</p>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-red-900/20 rounded-3xl p-6 shadow-xl h-[180px] flex items-center justify-center text-center">
        <div>
          <p className="text-red-400 text-sm font-semibold">Weather Unavailable</p>
          <p className="text-xs text-slate-500 mt-1">{error || 'Could not fetch weather data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🌤️ Local Forecast</span>
        </h3>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next 5 Days</p>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {forecast.time.slice(0, 5).map((dateStr, index) => {
          const date = new Date(dateStr);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const { icon, text } = getWeatherDetails(forecast.weathercode[index]);
          const maxT = Math.round(forecast.temperature_2m_max[index]);
          const minT = Math.round(forecast.temperature_2m_min[index]);

          return (
            <div key={dateStr} className="bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col items-center p-3 text-center transition-transform hover:-translate-y-1 hover:border-indigo-500/50 hover:bg-slate-900/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                {index === 0 ? 'Today' : dayName}
              </span>
              <span className="text-3xl mb-1 filter drop-shadow-md" title={text}>{icon}</span>
              <div className="flex flex-col mt-auto pt-1 w-full border-t border-slate-800/50">
                <span className="text-sm font-bold text-slate-200">{maxT}°</span>
                <span className="text-[10px] font-semibold text-slate-500">{minT}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
