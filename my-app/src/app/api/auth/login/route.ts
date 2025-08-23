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
   
    let client;
    let db;
    
    try {
      client = await typedClientPromise;
      db = client.db();
    } catch (connectionError) {
      console.error('Database connection failed:', connectionError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }
   
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
   
    // Set token in cookie
    const response = NextResponse.json({ 
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        email: user.email
      }
    });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 // 24 hours (matching JWT expiration)
    });
    
    return response;
   
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}