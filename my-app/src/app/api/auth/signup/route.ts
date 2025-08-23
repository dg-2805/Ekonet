import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { MongoClient } from 'mongodb';

// Type assertion to fix the TypeScript error
const typedClientPromise: Promise<MongoClient> = clientPromise;

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }
    
    const client = await typedClientPromise;
    const db = client.db();
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
    
    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({ 
      email, 
      password: hashedPassword,
      createdAt: new Date()
    });
    
    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}