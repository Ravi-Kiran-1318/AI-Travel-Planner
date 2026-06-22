const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  estimatedCostUSD: { type: Number, default: 0 },
  timeOfDay: { type: String, enum: ['Morning', 'Afternoon', 'Evening'] }
});

const TripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destination: { type: String, required: true },
  durationDays: { type: Number, required: true },
  budgetTier: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  interests: [{ type: String }],
  itinerary: [{
    dayNumber: { type: Number, required: true },
    activities: [ActivitySchema]
  }],
  hotels: [{
    name: { type: String, required: true },
    tier: { type: String },
    estimatedCostNightUSD: { type: Number },
    rating: { type: String }
  }],
  estimatedBudget: {
    transport: { type: Number, default: 0 },
    accommodation: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  packingList: [{
    item: { type: String, required: true },
    category: { type: String, enum: ['Documents', 'Clothing', 'Gear', 'Other'], default: 'Other' },
    isPacked: { type: Boolean, default: false }
  }],
  isPublic: { type: Boolean, default: false },
  climate: {
    temperatureRange: { type: String, default: '' },
    rainfall: { type: String, default: '' },
    weatherSummary: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Trip', TripSchema);
