import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { MongoClient } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const client: MongoClient = await clientPromise;
    const db = client.db();
    const user = await db.collection('users').findOne({ email: payload.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const { password, ...userInfo } = user;
    return NextResponse.json({ user: userInfo });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
