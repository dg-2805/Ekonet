// ===== lib/mongodb.ts =====
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Extend the global type to include our MongoDB promise
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// ===== lib/auth.ts (Frontend Authentication Utils) =====
interface AuthFormData {
  email: string;
  password: string;
  [key: string]: any;
}

interface AuthResponse {
  message?: string;
  error?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
  };
}

export async function handleSignup(formData: AuthFormData): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        // add other fields as needed
      }),
    });
    
    const data: AuthResponse = await res.json();
    
    if (res.ok) {
      // Success - you can handle UI updates here or in the calling component
      console.log('Signup successful:', data.message);
      return data;
    } else {
      // Error occurred
      console.error('Signup error:', data.error);
      return data;
    }
  } catch (error) {
    console.error('Network error during signup:', error);
    return { error: 'Network error. Please try again.' };
  }
}

export async function handleLogin(formData: AuthFormData): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
      }),
    });
    
    const data: AuthResponse = await res.json();
    
    if (res.ok && data.token) {
      // Save token securely
      localStorage.setItem('auth-token', data.token);
      // Or use cookies for better security:
      // document.cookie = `auth-token=${data.token}; secure; httpOnly; samesite=strict`;
      
      console.log('Login successful:', data.message);
      return data;
    } else {
      console.error('Login error:', data.error);
      return data;
    }
  } catch (error) {
    console.error('Network error during login:', error);
    return { error: 'Network error. Please try again.' };
  }
}

export function logout(): void {
  // Remove token from storage
  localStorage.removeItem('auth-token');
  // If using cookies:
  // document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  
  // Redirect to login or home page
  window.location.href = '/login';
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth-token');
}

export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  
  // Optional: Verify token hasn't expired
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch {
    return false;
  }
}