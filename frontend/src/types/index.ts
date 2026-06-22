export interface Activity {
  _id?: string;
  title: string;
  description?: string;
  estimatedCostUSD: number;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | string;
}

export interface ItineraryDay {
  dayNumber: number;
  activities: Activity[];
}

export interface Hotel {
  name: string;
  tier?: string;
  estimatedCostNightUSD?: number;
  rating?: string;
}

export interface EstimatedBudget {
  transport: number;
  accommodation: number;
  food: number;
  activities: number;
  total: number;
}

export interface PackingItem {
  _id?: string;
  item: string;
  category: 'Documents' | 'Clothing' | 'Gear' | 'Other' | string;
  isPacked: boolean;
}

export interface Trip {
  _id: string;
  userId: string;
  destination: string;
  durationDays: number;
  budgetTier: 'Low' | 'Medium' | 'High';
  interests: string[];
  itinerary: ItineraryDay[];
  hotels: Hotel[];
  estimatedBudget: EstimatedBudget;
  packingList: PackingItem[];
  isPublic?: boolean;
  climate?: {
    temperatureRange: string;
    rainfall: string;
    weatherSummary: string;
  };
  createdAt?: string;
  updatedAt?: string;
}
