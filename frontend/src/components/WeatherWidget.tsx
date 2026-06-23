'use client';

import React, { useState, useEffect } from 'react';

interface WeatherWidgetProps {
  destination: string;
}

interface DayForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipitationSum: number;
  windspeedMax: number;
}

interface WeatherData {
  current: {
    temp: number;
    weatherCode: number;
    humidity: number;
    windspeed: number;
    feelsLike: number;
  };
  daily: DayForecast[];
  location: string;
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '🌡️';
}

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 2) return 'Partly Cloudy';
  if (code <= 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Rain Showers';
  if (code <= 86) return 'Snow Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
      { headers: { 'User-Agent': 'AITravelPlannerFrontend/1.0' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name.split(',').slice(0, 2).join(','),
      };
    }
  } catch (e) {
    console.error('Geocode error:', e);
  }
  return null;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    const data = await res.json();

    const current = data.current;
    const daily = data.daily;

    const dailyForecasts: DayForecast[] = daily.time.map((date: string, i: number) => ({
      date,
      maxTemp: Math.round(daily.temperature_2m_max[i]),
      minTemp: Math.round(daily.temperature_2m_min[i]),
      weatherCode: daily.weather_code[i],
      precipitationSum: daily.precipitation_sum[i],
      windspeedMax: Math.round(daily.wind_speed_10m_max[i]),
    }));

    return {
      current: {
        temp: Math.round(current.temperature_2m),
        weatherCode: current.weather_code,
        humidity: current.relative_humidity_2m,
        windspeed: Math.round(current.wind_speed_10m),
        feelsLike: Math.round(current.apparent_temperature),
      },
      daily: dailyForecasts,
      location: '',
    };
  } catch (e) {
    console.error('Weather fetch error:', e);
    return null;
  }
}

export default function WeatherWidget({ destination }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    if (!destination) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);
      setWeather(null);

      const geo = await geocodeCity(destination);
      if (!geo || cancelled) {
        if (!cancelled) setError(true);
        if (!cancelled) setLoading(false);
        return;
      }
      setLocationName(geo.displayName);

      const w = await fetchWeather(geo.lat, geo.lon);
      if (!cancelled) {
        if (w) {
          setWeather(w);
        } else {
          setError(true);
        }
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [destination]);

  if (loading) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">🌤️</span>
          <h3 className="text-lg font-bold text-white">Live Weather Forecast</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-slate-800/50 rounded-2xl" />
          <div className="grid grid-cols-7 gap-1.5">
            {Array(7).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-slate-800/50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">🌤️</span>
          <h3 className="text-lg font-bold text-white">Live Weather Forecast</h3>
        </div>
        <p className="text-slate-500 text-xs">
          Unable to fetch live weather for <span className="text-slate-400 font-semibold">{destination}</span>. Check connection or destination name.
        </p>
      </div>
    );
  }

  const { current, daily } = weather;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🌤️</span>
            <h3 className="text-lg font-bold text-white">Live Weather Forecast</h3>
          </div>
          <p className="text-xs text-slate-500 truncate max-w-[200px]" title={locationName}>
            📍 {locationName || destination}
          </p>
        </div>
        <span className="text-[10px] bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 px-2 py-1 rounded-full font-semibold">
          LIVE
        </span>
      </div>

      {/* Current Conditions */}
      <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-indigo-900/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white">{current.temp}°</span>
              <span className="text-slate-400 text-sm mb-2">C</span>
            </div>
            <p className="text-indigo-300 text-sm font-semibold mt-1">{getWeatherLabel(current.weatherCode)}</p>
            <p className="text-slate-500 text-xs mt-1">Feels like {current.feelsLike}°C</p>
          </div>
          <span className="text-6xl">{getWeatherIcon(current.weatherCode)}</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-indigo-900/30">
          <div className="flex items-center gap-2">
            <span className="text-base">💧</span>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Humidity</p>
              <p className="text-sm font-bold text-slate-200">{current.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">💨</span>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Wind</p>
              <p className="text-sm font-bold text-slate-200">{current.windspeed} km/h</p>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast Strip */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">7-Day Forecast</p>
        <div className="grid grid-cols-7 gap-1.5">
          {daily.map((day, i) => (
            <div
              key={day.date}
              className={`flex flex-col items-center p-2 rounded-xl border transition-colors duration-200 ${
                i === 0
                  ? 'bg-indigo-950/50 border-indigo-700/50'
                  : 'bg-slate-950/40 border-slate-800/50 hover:border-slate-700'
              }`}
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase">{getDayLabel(day.date, i)}</span>
              <span className="text-xl my-1.5">{getWeatherIcon(day.weatherCode)}</span>
              <span className="text-[10px] font-bold text-slate-200">{day.maxTemp}°</span>
              <span className="text-[9px] text-slate-500">{day.minTemp}°</span>
              {day.precipitationSum > 0 && (
                <span className="text-[8px] text-blue-400 mt-1 font-semibold">{day.precipitationSum}mm</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Packing tip */}
      {(() => {
        const avgMax = daily.slice(0, 5).reduce((s, d) => s + d.maxTemp, 0) / 5;
        const hasRain = daily.slice(0, 5).some(d => d.precipitationSum > 2);
        const tip = avgMax < 10
          ? '🧥 Pack heavy warm layers and thermal wear.'
          : avgMax < 20
          ? '🧣 Bring a light jacket or hoodie — it can get cool.'
          : avgMax < 30
          ? '👕 Light cotton clothing recommended. Carry sunscreen!'
          : '☀️ Pack breathable clothing and stay hydrated.';
        return (
          <div className={`text-xs px-3 py-2.5 rounded-xl border ${hasRain ? 'bg-blue-950/20 border-blue-900/30 text-blue-300' : 'bg-slate-950/30 border-slate-800/50 text-slate-400'}`}>
            {hasRain ? '🌂 ' : ''}{tip}
            {hasRain && ' Also pack a compact umbrella or rain jacket.'}
          </div>
        );
      })()}
    </div>
  );
}
