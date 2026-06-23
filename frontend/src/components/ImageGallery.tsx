'use client';

import React, { useState, useEffect } from 'react';

interface ImageGalleryProps {
  destination: string;
}

export default function ImageGallery({ destination }: ImageGalleryProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchImages = async () => {
      setLoading(true);
      try {
        const cleanDest = destination.split(',')[0].trim();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/images?destination=${encodeURIComponent(cleanDest)}`);
        
        if (res.ok) {
          const data = await res.json();
          if (data.images && data.images.length > 0 && isMounted) {
            setImages(data.images);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch Pexels images", err);
      }
      
      // Fallback to LoremFlickr if Pexels fails or returns empty
      if (isMounted) {
        const fallbackUrls = Array.from({ length: 6 }).map((_, i) => {
          return `https://loremflickr.com/800/600/${encodeURIComponent(destination.split(',')[0].trim().toLowerCase())},travel,city/all?lock=${Math.floor(Math.random() * 1000) + i}`;
        });
        setImages(fallbackUrls);
        setLoading(false);
      }
    };

    fetchImages();

    return () => {
      isMounted = false;
    };
  }, [destination]);

  if (loading) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-400">Curating beautiful photos of {destination}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
      <div className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📸 Destination Gallery</span>
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Get inspired by the sights of {destination}
          </p>
        </div>
      </div>

      {/* Masonry-style Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((url, idx) => {
          // Make some images span 2 rows for a masonry effect
          const isLarge = idx === 0 || idx === 3;
          return (
            <div 
              key={idx} 
              className={`relative rounded-2xl overflow-hidden group bg-slate-950 ${isLarge ? 'row-span-2 sm:h-[400px]' : 'h-[190px]'}`}
            >
              {/* Image */}
              <img 
                src={url} 
                alt={`${destination} scenery ${idx + 1}`} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
              
              {/* Hover Content */}
              <div className="absolute inset-0 p-4 flex flex-col justify-end translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-white font-bold text-sm tracking-wide">{destination}</p>
                <p className="text-slate-300 text-[10px] uppercase font-semibold">Travel Collection</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
