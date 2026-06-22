const https = require('https');
const Trip = require('../models/Trip');

// Native helper to make HTTPS POST requests in Node 16
function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse response: ' + e.message));
          }
        } else {
          const err = new Error(`Request failed with status ${res.statusCode}`);
          err.statusCode = res.statusCode;
          err.responseBody = body;
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Gemini API retry caller with exponential backoff
async function callGeminiWithRetry(prompt, retries = 5, delay = 1000) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await httpsPost(url, payload);
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Malformed response from Gemini API');
      }
      return JSON.parse(text);
    } catch (error) {
      console.warn(`Gemini API connection attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) {
        throw error;
      }
      // Wait for exponential backoff (1s, 2s, 4s, 8s, 16s)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

// Highly realistic mock generator when Gemini API Key is not set or rate-limited
function generateMockTrip(destination, durationDays, budgetTier, interests) {
  const activityMap = {
    food: [
      { title: 'Local Culinary Tour', description: `Explore popular local food stalls and authentic street dining in ${destination}.`, cost: { Low: 15, Medium: 35, High: 90 } },
      { title: 'Regional Cooking Class', description: 'Hands-on class to learn how to prepare authentic local recipes.', cost: { Low: 20, Medium: 45, High: 110 } },
      { title: 'Fine Dining Dinner', description: 'Gourmet dining experience at a renowned local restaurant.', cost: { Low: 30, Medium: 70, High: 200 } }
    ],
    culture: [
      { title: 'Heritage Sites & Museum Tour', description: 'Discover local history, ancient architecture, and cultural exhibits.', cost: { Low: 5, Medium: 25, High: 55 } },
      { title: 'Art & Gallery Walk', description: 'Stroll through the modern art studios and local artisan workshops.', cost: { Low: 0, Medium: 15, High: 45 } },
      { title: 'Traditional Music/Dance Performance', description: 'Watch an evening showcase of folklore dances or plays.', cost: { Low: 15, Medium: 40, High: 100 } }
    ],
    adventure: [
      { title: 'Scenic Wilderness Hike', description: 'A guided trek through natural parks, mountain trails, and viewpoints.', cost: { Low: 0, Medium: 30, High: 75 } },
      { title: 'Ziplining & Outdoor Sports', description: 'An adrenaline-filled canopy flight or outdoor action experience.', cost: { Low: 35, Medium: 65, High: 140 } },
      { title: 'Water Snorkeling & Kayaking', description: 'Explore clean local coastal areas and waterways with gear.', cost: { Low: 20, Medium: 50, High: 120 } }
    ],
    shopping: [
      { title: 'Central Artisan Bazaar', description: 'Browse hand-made items, clothing, souvenirs, and vintage crafts.', cost: { Low: 0, Medium: 15, High: 50 } },
      { title: 'Fashion District Shopping', description: 'Visit premier boutiques and commercial malls.', cost: { Low: 0, Medium: 40, High: 150 } }
    ]
  };

  const generalActivities = [
    { title: 'Historical Walking Tour', description: 'Walk through key squares, parks, and downtown landmarks.', cost: { Low: 0, Medium: 10, High: 35 } },
    { title: 'Scenic Vista Observation Deck', description: 'Catch beautiful panoramic city or nature views.', cost: { Low: 5, Medium: 20, High: 45 } },
    { title: 'Local Park & Botanical Gardens', description: 'Relaxing stroll through popular gardens and central squares.', cost: { Low: 0, Medium: 0, High: 0 } }
  ];

  const destLower = destination.toLowerCase();
  const isLowCostRegion = 
    destLower.includes('india') || 
    destLower.includes('bangalore') || 
    destLower.includes('banglore') || 
    destLower.includes('hyderabad') || 
    destLower.includes('tirupati') || 
    destLower.includes('srikakulam') || 
    destLower.includes('ooty') || 
    destLower.includes('vizag') || 
    destLower.includes('visakhapatnam') || 
    destLower.includes('delhi') || 
    destLower.includes('mumbai') || 
    destLower.includes('chennai') || 
    destLower.includes('kolkata') || 
    destLower.includes('goa') || 
    destLower.includes('kerala') || 
    destLower.includes('thailand') || 
    destLower.includes('bali') || 
    destLower.includes('vietnam') || 
    destLower.includes('indonesia') || 
    destLower.includes('nepal');

  const costMultiplier = isLowCostRegion ? (budgetTier === 'High' ? 0.5 : 0.35) : 1.0;

  const selectedCategories = interests.map(i => i.toLowerCase()).filter(cat => activityMap[cat]);
  if (selectedCategories.length === 0) {
    selectedCategories.push('culture');
  }

  const itinerary = [];
  const times = ['Morning', 'Afternoon', 'Evening'];
  let activityCostSum = 0;

  for (let d = 1; d <= durationDays; d++) {
    const dayActivities = [];
    for (let t = 0; t < 3; t++) {
      const timeOfDay = times[t];
      let actTemplate;
      if (t === 1 && selectedCategories.length > 0) {
        const cat = selectedCategories[Math.floor(Math.random() * selectedCategories.length)];
        const list = activityMap[cat];
        actTemplate = list[Math.floor(Math.random() * list.length)];
      } else {
        actTemplate = generalActivities[Math.floor(Math.random() * generalActivities.length)];
      }

      const cost = Math.round((actTemplate.cost[budgetTier] || 10) * costMultiplier);
      activityCostSum += cost;

      dayActivities.push({
        title: `${actTemplate.title}`,
        description: actTemplate.description,
        estimatedCostUSD: cost,
        timeOfDay: timeOfDay
      });
    }

    itinerary.push({
      dayNumber: d,
      activities: dayActivities
    });
  }

  const hotelTiers = {
    Low: [
      { name: `${destination} Cozy Hostel`, tier: 'Budget Friendly', estimatedCostNightUSD: 35, rating: '4.1/5' },
      { name: 'Backpackers Central Suites', tier: 'Budget Friendly', estimatedCostNightUSD: 45, rating: '4.2/5' }
    ],
    Medium: [
      { name: `${destination} Plaza Hotel`, tier: 'Mid Range', estimatedCostNightUSD: 95, rating: '4.5/5' },
      { name: 'Heritage Boutique Lodge', tier: 'Mid Range', estimatedCostNightUSD: 130, rating: '4.6/5' }
    ],
    High: [
      { name: `The Royal Palace Resort & Spa`, tier: 'Luxury', estimatedCostNightUSD: 380, rating: '4.9/5' },
      { name: `Grand Vista Ritz`, tier: 'Luxury', estimatedCostNightUSD: 450, rating: '4.8/5' }
    ]
  };

  const selectedHotels = (hotelTiers[budgetTier] || hotelTiers.Medium).map(hotel => ({
    ...hotel,
    estimatedCostNightUSD: Math.round(hotel.estimatedCostNightUSD * costMultiplier)
  }));

  const nightCost = selectedHotels[0].estimatedCostNightUSD;
  const accommodation = nightCost * (durationDays - 1 || 1);
  const foodCostPerDay = Math.round({ Low: 25, Medium: 55, High: 160 }[budgetTier] * costMultiplier);
  const food = foodCostPerDay * durationDays;
  const transportCost = Math.round({ Low: 40, Medium: 110, High: 300 }[budgetTier] * costMultiplier);
  
  const estimatedBudget = {
    transport: transportCost,
    accommodation: accommodation,
    food: food,
    activities: activityCostSum,
    total: transportCost + accommodation + food + activityCostSum
  };

  // Weather-Aware packing checklist items (Dynamic custom feature)
  const packingTemplates = [
    { item: 'Valid Passport & Visas', category: 'Documents' },
    { item: 'Printed Flight tickets & Hotel booking confirmation', category: 'Documents' },
    { item: 'Travel Insurance Documents', category: 'Documents' },
    { item: 'Universal Wall Charger & Power Bank', category: 'Gear' },
    { item: 'Refillable Water Bottle', category: 'Gear' },
    { item: 'Small First-Aid Pack & Daily Meds', category: 'Other' },
    { item: 'Sun protection cream (SPF 50) & Sunglasses', category: 'Other' }
  ];

  // Destination specific packing list customization
  const climateWear = {
    Low: { item: 'Comfortable Sneakers & Cotton Shirts', category: 'Clothing' },
    Medium: { item: 'Layering Hoodies & Lightweight Windbreaker', category: 'Clothing' },
    High: { item: 'Thermal Wear & Heavy Insulated Jacket', category: 'Clothing' }
  };
  
  const packingList = [...packingTemplates];
  
  // Custom packing elements depending on budget & category
  packingList.push({ item: 'Sturdy Walking Shoes', category: 'Clothing' });
  packingList.push({ item: 'Casual wear sets & Undergarments', category: 'Clothing' });
  if (interests.some(i => i.toLowerCase() === 'adventure')) {
    packingList.push({ item: 'Sturdy Hiking Boots & Sport Wear', category: 'Gear' });
  }
  if (interests.some(i => i.toLowerCase() === 'food')) {
    packingList.push({ item: 'Dining Reservation notes & Hand sanitizers', category: 'Other' });
  }

  // Climate dress mapping
  packingList.push(climateWear[budgetTier === 'High' ? 'High' : budgetTier === 'Medium' ? 'Medium' : 'Low']);

  const finalPackingList = packingList.map((p, idx) => ({
    _id: `mock-pack-${idx}`,
    item: p.item,
    category: p.category,
    isPacked: false
  }));

  const climateData = {
    Low: { temperatureRange: '12°C - 20°C', rainfall: 'Moderate (12 days/month)', weatherSummary: 'Mild and pleasant with periodic brief showers.' },
    Medium: { temperatureRange: '18°C - 26°C', rainfall: 'Low (4 days/month)', weatherSummary: 'Warm, sunny and perfect for walking tours.' },
    High: { temperatureRange: '25°C - 33°C', rainfall: 'High (18 days/month)', weatherSummary: 'Hot and humid climate with seasonal afternoon monsoon downpours.' }
  }[budgetTier] || { temperatureRange: '15°C - 22°C', rainfall: 'Low', weatherSummary: 'Comfortable seasonal weather.' };

  return {
    itinerary,
    hotels: selectedHotels,
    estimatedBudget,
    packingList: finalPackingList,
    climate: climateData
  };
}

const TRANSPORT_RATES = {
  Flight: 0.12,
  Train: 0.08,
  Driving: 0.06,
  Bus: 0.04
};

function geocodeAddress(address) {
  return new Promise((resolve) => {
    if (!address) return resolve(null);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'AITravelPlanner/1.0 (contact@example.com)'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            if (data && data.length > 0) {
              resolve({
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`Geocoding error for ${address}:`, err.message);
      resolve(null);
    });
    req.end();
  });
}

function getHaversineDistance(coords1, coords2) {
  if (!coords1 || !coords2) return 0;
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLon = (coords2.lon - coords1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Generate itinerary
exports.generateNewTrip = async (req, res) => {
  const { destination, durationDays, budgetTier, interests, source, transportMode, sourceCoords, destinationCoords, transitCostUSD } = req.body;
  const userId = req.user.id; // From auth middleware

  if (!destination || !durationDays || !budgetTier) {
    return res.status(400).json({ message: 'Destination, durationDays, and budgetTier are required.' });
  }

  const duration = parseInt(durationDays);
  if (isNaN(duration) || duration <= 0) {
    return res.status(400).json({ message: 'durationDays must be a positive integer.' });
  }

  const selectedInterests = Array.isArray(interests) ? interests : [];

  const sourceQuery = source || '';
  const transportPref = transportMode || 'Flight';
  const tripSourceCoords = sourceCoords || [];
  const tripDestCoords = destinationCoords || [];

  // Fallback to Mock generator if API key is not present
  if (!process.env.GEMINI_API_KEY) {
    console.info('GEMINI_API_KEY not found. Using local mock generator...');
    const result = generateMockTrip(destination, duration, budgetTier, selectedInterests);
    
    let transitCost = 0;
    if (transitCostUSD !== undefined) {
      transitCost = transitCostUSD;
    } else if (sourceQuery && destination) {
      let sCoords = null;
      let dCoords = null;
      if (tripSourceCoords.length === 2 && tripDestCoords.length === 2) {
        sCoords = { lat: tripSourceCoords[0], lon: tripSourceCoords[1] };
        dCoords = { lat: tripDestCoords[0], lon: tripDestCoords[1] };
      } else {
        sCoords = await geocodeAddress(sourceQuery);
        dCoords = await geocodeAddress(destination);
      }
      if (sCoords && dCoords) {
        const dist = getHaversineDistance(sCoords, dCoords);
        const rate = TRANSPORT_RATES[transportPref] || 0.12;
        transitCost = Math.round(dist * rate);
      }
    } else {
      transitCost = result.estimatedBudget.transport;
    }

    const newTrip = new Trip({
      userId,
      destination,
      durationDays: duration,
      budgetTier,
      interests: selectedInterests,
      source: sourceQuery,
      transportMode: transportPref,
      transitCostUSD: transitCost,
      sourceCoords: tripSourceCoords,
      destinationCoords: tripDestCoords,
      itinerary: result.itinerary,
      hotels: result.hotels,
      estimatedBudget: {
        ...result.estimatedBudget,
        transport: transitCost,
        total: transitCost + result.estimatedBudget.accommodation + result.estimatedBudget.food + result.estimatedBudget.activities
      },
      packingList: result.packingList,
      climate: result.climate
    });
    const savedTrip = await newTrip.save();
    return res.status(201).json(savedTrip);
  }

  // LLM Prompt
  const prompt = `
    Create a highly professional travel plan for a ${duration}-day trip to "${destination}".
    Budget tier preference: "${budgetTier}".
    Traveler interests: ${selectedInterests.join(', ') || 'General Sightseeing'}.

    You must output ONLY a valid JSON object conforming exactly to this structure (note: values here are illustrative placeholders. You must replace them with realistic calculations for the destination and budget tier):
    {
      "itinerary": [
        {
          "dayNumber": 1,
          "activities": [
            { "title": "Activity name", "description": "Brief description outlining locations", "estimatedCostUSD": 10, "timeOfDay": "Morning" },
            { "title": "Next Activity", "description": "Details", "estimatedCostUSD": 15, "timeOfDay": "Afternoon" },
            { "title": "Evening Spot", "description": "Details", "estimatedCostUSD": 20, "timeOfDay": "Evening" }
          ]
        }
      ],
      "hotels": [
        { "name": "Recommended Hotel Name", "tier": "Budget Friendly or Mid Range or Luxury matching budgetTier", "estimatedCostNightUSD": 45, "rating": "4.5/5" }
      ],
      "estimatedBudget": {
        "transport": 50,
        "accommodation": 150,
        "food": 80,
        "activities": 65,
        "total": 345
      },
      "packingList": [
        { "item": "Passport", "category": "Documents", "isPacked": false },
        { "item": "Climate-appropriate clothing", "category": "Clothing", "isPacked": false }
      ],
      "climate": {
        "temperatureRange": "Average temperature range (e.g. 15°C - 22°C)",
        "rainfall": "General rainfall likelihood (e.g. Low/Moderate/High or 5 days/month)",
        "weatherSummary": "A short 1-sentence description of the expected weather conditions at this time of year"
      }
    }

    Important Budget & Cost Guidelines:
    - Crucial: Scale all costs realistically to the destination's actual local economy (purchasing power parity). For example, a trip in India, Thailand, Bali, or other lower-cost regions must have significantly lower costs compared to Western Europe or the USA.
    - Keep budgets realistic for the tier selected ("${budgetTier}"):
      * If budgetTier is "Low", optimize for a frugal backpacker/budget traveler:
        - Accommodations: Hostels, homestays, or cheap guesthouses. Target: $10 - $45 per night depending on location.
        - Food: Street food, local casual diners. Target: $5 - $25 per day depending on location.
        - Activities: Free attractions, walking tours, public parks, cheap museum entries. Target: $0 - $15 per activity.
        - Transport: Public transit, walking, or shared rides. Target: $5 - $20 total.
      * If budgetTier is "Medium", optimize for a comfortable mid-range traveler:
        - Accommodations: 3-star hotels, private rooms. Target: $30 - $120 per night depending on location.
        - Food: Mid-range casual restaurants, local cafes. Target: $15 - $50 per day depending on location.
        - Activities: Regular entry tickets, group tours, popular sights. Target: $10 - $40 per activity.
        - Transport: Taxis, metro, or car rentals. Target: $20 - $80 total.
      * If budgetTier is "High", optimize for luxury or premium travel:
        - Accommodations: 4/5-star hotels, luxury resorts. Target: $150 - $500+ per night.
        - Food: Fine dining, high-end restaurants. Target: $60 - $200+ per day.
        - Activities: Private tours, exclusive experiences, premium entry tickets. Target: $40 - $150+ per activity.
        - Transport: Private transfers, flights, or premium car rentals.
    - Provide exactly ${duration} days in the itinerary.
    - Write 2-3 activities per day. Set realistic estimatedCostUSD estimates for activities.
    - Estimate the total budget components accurately based on typical travel expenses.
    - Generate a weather-aware packing list based on destination climate at this current time of year and activities. Categorize items into "Documents", "Clothing", "Gear", "Other".
  `;

  try {
    const cleanResult = await callGeminiWithRetry(prompt);

    let transitCost = 0;
    if (transitCostUSD !== undefined) {
      transitCost = transitCostUSD;
    } else if (sourceQuery && destination) {
      let sCoords = null;
      let dCoords = null;
      if (tripSourceCoords.length === 2 && tripDestCoords.length === 2) {
        sCoords = { lat: tripSourceCoords[0], lon: tripSourceCoords[1] };
        dCoords = { lat: tripDestCoords[0], lon: tripDestCoords[1] };
      } else {
        sCoords = await geocodeAddress(sourceQuery);
        dCoords = await geocodeAddress(destination);
      }
      if (sCoords && dCoords) {
        const dist = getHaversineDistance(sCoords, dCoords);
        const rate = TRANSPORT_RATES[transportPref] || 0.12;
        transitCost = Math.round(dist * rate);
      }
    } else {
      transitCost = cleanResult.estimatedBudget?.transport || 0;
    }

    const newTrip = new Trip({
      userId,
      destination,
      durationDays: duration,
      budgetTier,
      interests: selectedInterests,
      source: sourceQuery,
      transportMode: transportPref,
      transitCostUSD: transitCost,
      sourceCoords: tripSourceCoords,
      destinationCoords: tripDestCoords,
      itinerary: cleanResult.itinerary,
      hotels: cleanResult.hotels,
      estimatedBudget: {
        ...cleanResult.estimatedBudget,
        transport: transitCost,
        total: transitCost + (cleanResult.estimatedBudget?.accommodation || 0) + (cleanResult.estimatedBudget?.food || 0) + (cleanResult.estimatedBudget?.activities || 0)
      },
      packingList: cleanResult.packingList,
      climate: cleanResult.climate || {
        temperatureRange: "15°C - 22°C",
        rainfall: "Moderate",
        weatherSummary: "Pleasant seasonal conditions expected."
      }
    });

    const savedTrip = await newTrip.save();
    return res.status(201).json(savedTrip);
  } catch (error) {
    console.error("Critical AI Generation Error, falling back to mock generator:", error);
    // Graceful fallback to mock data rather than server crash
    const result = generateMockTrip(destination, duration, budgetTier, selectedInterests);
    
    let transitCost = 0;
    if (transitCostUSD !== undefined) {
      transitCost = transitCostUSD;
    } else if (sourceQuery && destination) {
      let sCoords = null;
      let dCoords = null;
      if (tripSourceCoords.length === 2 && tripDestCoords.length === 2) {
        sCoords = { lat: tripSourceCoords[0], lon: tripSourceCoords[1] };
        dCoords = { lat: tripDestCoords[0], lon: tripDestCoords[1] };
      } else {
        sCoords = await geocodeAddress(sourceQuery);
        dCoords = await geocodeAddress(destination);
      }
      if (sCoords && dCoords) {
        const dist = getHaversineDistance(sCoords, dCoords);
        const rate = TRANSPORT_RATES[transportPref] || 0.12;
        transitCost = Math.round(dist * rate);
      }
    } else {
      transitCost = result.estimatedBudget.transport;
    }

    const newTrip = new Trip({
      userId,
      destination,
      durationDays: duration,
      budgetTier,
      interests: selectedInterests,
      source: sourceQuery,
      transportMode: transportPref,
      transitCostUSD: transitCost,
      sourceCoords: tripSourceCoords,
      destinationCoords: tripDestCoords,
      itinerary: result.itinerary,
      hotels: result.hotels,
      estimatedBudget: {
        ...result.estimatedBudget,
        transport: transitCost,
        total: transitCost + result.estimatedBudget.accommodation + result.estimatedBudget.food + result.estimatedBudget.activities
      },
      packingList: result.packingList,
      climate: result.climate
    });
    const savedTrip = await newTrip.save();
    return res.status(201).json(savedTrip);
  }
};

// Get all trips for logged in user
exports.getUserTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(trips);
  } catch (error) {
    console.error('Fetch trips error:', error);
    return res.status(500).json({ message: 'Error retrieving your travel itineraries.' });
  }
};

// Get specific trip by id
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Itinerary not found or access denied.' });
    }
    return res.status(200).json(trip);
  } catch (error) {
    console.error('Fetch trip by ID error:', error);
    return res.status(500).json({ message: 'Error retrieving the itinerary.' });
  }
};

// Get public trip (no authentication required)
exports.getPublicTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, isPublic: true });
    if (!trip) {
      return res.status(404).json({ message: 'Itinerary not found or is set to private.' });
    }
    return res.status(200).json(trip);
  } catch (error) {
    console.error('Fetch public trip error:', error);
    return res.status(500).json({ message: 'Error retrieving the public itinerary.' });
  }
};

// Update entire trip data structures (activities, packing checklist toggles)
exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Itinerary not found or access denied.' });
    }

    // Check what is being updated
    if (req.body.itinerary) trip.itinerary = req.body.itinerary;
    if (req.body.packingList) trip.packingList = req.body.packingList;
    if (req.body.hotels) trip.hotels = req.body.hotels;
    if (req.body.isPublic !== undefined) trip.isPublic = req.body.isPublic;

    let recalculateBudget = false;
    if (req.body.source !== undefined) {
      trip.source = req.body.source;
      recalculateBudget = true;
    }
    if (req.body.transportMode !== undefined) {
      trip.transportMode = req.body.transportMode;
      recalculateBudget = true;
    }
    if (req.body.destination !== undefined) {
      trip.destination = req.body.destination;
      recalculateBudget = true;
    }
    if (req.body.sourceCoords !== undefined) {
      trip.sourceCoords = req.body.sourceCoords;
      recalculateBudget = true;
    }
    if (req.body.destinationCoords !== undefined) {
      trip.destinationCoords = req.body.destinationCoords;
      recalculateBudget = true;
    }
    if (req.body.transitCostUSD !== undefined) {
      trip.transitCostUSD = req.body.transitCostUSD;
      trip.estimatedBudget.transport = req.body.transitCostUSD;
      recalculateBudget = false; // Bypass backend geocoding recalculations
    }

    if (recalculateBudget && req.body.transitCostUSD === undefined) {
      if (trip.sourceCoords && trip.sourceCoords.length === 2 && trip.destinationCoords && trip.destinationCoords.length === 2) {
        const sCoords = { lat: trip.sourceCoords[0], lon: trip.sourceCoords[1] };
        const dCoords = { lat: trip.destinationCoords[0], lon: trip.destinationCoords[1] };
        const dist = getHaversineDistance(sCoords, dCoords);
        const rate = TRANSPORT_RATES[trip.transportMode] || 0.12;
        trip.transitCostUSD = Math.round(dist * rate);
      } else {
        const sourceQuery = trip.source;
        const destQuery = trip.destination;
        if (sourceQuery && destQuery) {
          const sCoords = await geocodeAddress(sourceQuery);
          const dCoords = await geocodeAddress(destQuery);
          if (sCoords && dCoords) {
            trip.sourceCoords = [sCoords.lat, sCoords.lon];
            trip.destinationCoords = [dCoords.lat, dCoords.lon];
            const dist = getHaversineDistance(sCoords, dCoords);
            const rate = TRANSPORT_RATES[trip.transportMode] || 0.12;
            trip.transitCostUSD = Math.round(dist * rate);
          } else {
            trip.transitCostUSD = 0;
          }
        } else {
          trip.transitCostUSD = 0;
        }
      }
      trip.estimatedBudget.transport = trip.transitCostUSD;
    }

    if (req.body.estimatedBudget) {
      trip.estimatedBudget = {
        ...trip.estimatedBudget.toObject(),
        ...req.body.estimatedBudget,
        transport: (req.body.transitCostUSD !== undefined) 
          ? req.body.transitCostUSD 
          : (recalculateBudget ? trip.transitCostUSD : (req.body.estimatedBudget.transport !== undefined ? req.body.estimatedBudget.transport : trip.estimatedBudget.transport))
      };
    }

    // Always keep total in sync
    trip.estimatedBudget.total = 
      (trip.estimatedBudget.transport || 0) + 
      (trip.estimatedBudget.accommodation || 0) + 
      (trip.estimatedBudget.food || 0) + 
      (trip.estimatedBudget.activities || 0);

    const savedTrip = await trip.save();
    return res.status(200).json(savedTrip);
  } catch (error) {
    console.error('Update trip error:', error);
    return res.status(500).json({ message: 'Error updating the travel details.' });
  }
};

// Delete trip
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Itinerary not found or access denied.' });
    }
    return res.status(200).json({ message: 'Itinerary deleted successfully.' });
  } catch (error) {
    console.error('Delete trip error:', error);
    return res.status(500).json({ message: 'Error deleting the itinerary.' });
  }
};

// Regenerate specific day of trip
exports.regenerateDay = async (req, res) => {
  const { dayNumber, instructions } = req.body;
  const tripId = req.params.id;

  if (!dayNumber || !instructions) {
    return res.status(400).json({ message: 'dayNumber and instructions are required.' });
  }

  try {
    const trip = await Trip.findOne({ _id: tripId, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Itinerary not found or access denied.' });
    }

    const targetDayIndex = trip.itinerary.findIndex(day => day.dayNumber === parseInt(dayNumber));
    if (targetDayIndex === -1) {
      return res.status(400).json({ message: `Day ${dayNumber} does not exist in this itinerary.` });
    }

    const currentDayActivities = JSON.stringify(trip.itinerary[targetDayIndex].activities);

    let newActivities = [];

    if (!process.env.GEMINI_API_KEY) {
      console.info('GEMINI_API_KEY not found. Using local mock generator for day update...');
      // Simple smart mock activity generation based on instruction terms
      const text = instructions.toLowerCase();
      let type = 'culture';
      if (text.includes('food') || text.includes('eat') || text.includes('dine') || text.includes('restaurant')) type = 'food';
      else if (text.includes('outdoor') || text.includes('adventure') || text.includes('hike') || text.includes('sport') || text.includes('climb')) type = 'adventure';
      else if (text.includes('shop') || text.includes('mall') || text.includes('souvenir')) type = 'shopping';

      const mockData = generateMockTrip(trip.destination, 1, trip.budgetTier, [type]);
      newActivities = mockData.itinerary[0].activities;
    } else {
      const prompt = `
        You are an expert travel assistant modifying a trip to "${trip.destination}".
        The traveler has a budget tier of "${trip.budgetTier}" and their current plan for Day ${dayNumber} is:
        ${currentDayActivities}

        They want to regenerate Day ${dayNumber} based on the following request:
        "${instructions}"

        You must output ONLY a valid JSON object matching this schema:
        {
          "dayNumber": ${dayNumber},
          "activities": [
            { "title": "Activity name", "description": "Brief details on what to do", "estimatedCostUSD": 20, "timeOfDay": "Morning" },
            { "title": "Activity name", "description": "Brief details", "estimatedCostUSD": 25, "timeOfDay": "Afternoon" },
            { "title": "Activity name", "description": "Brief details", "estimatedCostUSD": 45, "timeOfDay": "Evening" }
          ]
        }
        
        Ensure activities align with the request, are realistic, and fit within the budget preference.
      `;

      try {
        const cleanResult = await callGeminiWithRetry(prompt);
        newActivities = cleanResult.activities;
      } catch (error) {
        console.error("Critical Day Regeneration Error, falling back to mock:", error);
        const mockData = generateMockTrip(trip.destination, 1, trip.budgetTier, ['adventure']);
        newActivities = mockData.itinerary[0].activities;
      }
    }

    // Assign the new activities
    trip.itinerary[targetDayIndex].activities = newActivities;
    
    // Recalculate total budget based on new activities cost
    let newActivitySum = 0;
    trip.itinerary.forEach(day => {
      day.activities.forEach(act => {
        newActivitySum += act.estimatedCostUSD || 0;
      });
    });

    trip.estimatedBudget.activities = newActivitySum;
    trip.estimatedBudget.total = trip.estimatedBudget.transport + trip.estimatedBudget.accommodation + trip.estimatedBudget.food + newActivitySum;

    const savedTrip = await trip.save();
    return res.status(200).json(savedTrip);
  } catch (error) {
    console.error('Regenerate day error:', error);
    return res.status(500).json({ message: 'Error regenerating the itinerary day.' });
  }
};
