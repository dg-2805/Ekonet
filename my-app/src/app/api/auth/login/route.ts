import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { MongoClient } from 'mongodb';

// Explicitly type clientPromise to avoid implicit 'any' error
const typedClientPromise: Promise<MongoClient> = clientPromise;

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }
    
    const client = await typedClientPromise;
    const db = client.db();
    
    // Find user by email
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(), 
        email: user.email 
      }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );
    
    return NextResponse.json({ 
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        email: user.email
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}