import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

// Type assertion to fix the TypeScript error
const typedClientPromise: Promise<MongoClient> = clientPromise;

export async function POST(req: Request) {
  try {
    let email, password, name, role, orgName, description, location;
    let licenseDocument, licenseExpiry, licenseAuthority;
    let body;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      email = formData.get('email');
      password = formData.get('password');
      name = formData.get('name');
      role = formData.get('role');
      orgName = formData.get('orgName');
      description = formData.get('description');
      location = formData.get('location');
      licenseDocument = formData.get('licenseDocument');
      licenseExpiry = formData.get('licenseExpiry');
      licenseAuthority = formData.get('licenseAuthority');
    } else {
      body = await req.json();
      email = body.email;
      password = body.password;
      name = body.name;
      role = body.role;
      orgName = body.orgName;
      description = body.description;
      location = body.location;
      licenseDocument = body.licenseDocument;
      licenseExpiry = body.licenseExpiry;
      licenseAuthority = body.licenseAuthority;
    }
   
    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: email, password, name, and role are required' 
      }, { status: 400 });
    }

    // Validate role-specific fields
    if (role === 'ngo' && (!orgName || !description || !licenseDocument || !licenseExpiry || !licenseAuthority)) {
      return NextResponse.json({ 
        error: 'NGO registration requires organization name, description, license document, expiry date, and issuing authority' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }
   
    let client: MongoClient;
    
    try {
      client = await typedClientPromise;
    } catch (connectionError) {
      console.error('MongoDB connection error:', connectionError);
      
      // Check if it's an SSL error
      if (connectionError instanceof Error && connectionError.message.includes('SSL')) {
        console.error('SSL/TLS Error detected. Check your MongoDB connection string and SSL settings.');
        return NextResponse.json({ 
          error: 'Database connection error. Please try again later.' 
        }, { status: 503 });
      }
      
      throw connectionError;
    }
    
    const db = client.db();
   
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
   
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds for better security
    
    // Prepare user data based on role
    const userData = {
      email,
      password: hashedPassword,
      name,
      role,
      location: location || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...(role === 'ngo' && {
        orgName,
        description,
        licenseDocument, // This will be a File or Blob
        licenseExpiry,
        licenseAuthority,
        verified: false, // NGOs might need verification
      }),
      ...(role === 'reporter' && {
        reportsCount: 0,
      })
    };

    // Create user
    const result = await db.collection('users').insertOne(userData);
    
    // Generate JWT token for new user
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
    const token = jwt.sign(
      { 
        userId: result.insertedId.toString(), 
        email,
        role,
        name 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Prepare user data to return (without password)
    const userToReturn = {
      id: result.insertedId.toString(),
      email,
      name,
      role,
      location,
      ...(role === 'ngo' && {
        orgName,
        description,
        licenseExpiry,
        licenseAuthority,
        verified: false,
      }),
      ...(role === 'reporter' && {
        reportsCount: 0,
      })
    };

    // Set token in cookie
    const response = NextResponse.json({ 
      message: 'User created successfully',
      user: userToReturn,
      token // Also return token for localStorage storage
    }, { status: 201 });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
   
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('E11000')) {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }
      
      if (error.message.includes('MongoServerSelectionError')) {
        return NextResponse.json({ 
          error: 'Database connection failed. Please try again later.' 
        }, { status: 503 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}