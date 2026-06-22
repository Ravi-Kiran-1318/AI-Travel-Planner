const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (credentials: any) => 
      request<{ token: string; user: { id: string; email: string } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
      
    register: (credentials: any) => 
      request<{ token: string; user: { id: string; email: string } }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
  },
  
  trips: {
    getAll: () => 
      request<any[]>('/api/trips', {
        method: 'GET',
      }),
      
    getById: (id: string) => 
      request<any>(`/api/trips/${id}`, {
        method: 'GET',
      }),
      
    getPublic: (id: string) => 
      request<any>(`/api/trips/public/${id}`, {
        method: 'GET',
      }),
      
    create: (tripData: { destination: string; durationDays: number; budgetTier: string; interests: string[] }) => 
      request<any>('/api/trips', {
        method: 'POST',
        body: JSON.stringify(tripData),
      }),
      
    update: (id: string, updateData: any) => 
      request<any>(`/api/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }),
      
    delete: (id: string) => 
      request<{ message: string }>(`/api/trips/${id}`, {
        method: 'DELETE',
      }),
      
    regenerateDay: (id: string, dayNumber: number, instructions: string) => 
      request<any>(`/api/trips/${id}/regenerate-day`, {
        method: 'POST',
        body: JSON.stringify({ dayNumber, instructions }),
      }),
  },
};
