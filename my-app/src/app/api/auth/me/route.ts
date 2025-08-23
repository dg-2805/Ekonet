import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    // Get the Authorization header (JWT token)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    console.log('API /auth/me called with JWT token')
    
    // Verify the JWT token and extract user ID
    // For now, we'll decode it to get the user ID (in production, you'd verify the signature)
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
      const userId = payload.userId // Based on the login/signup API structure
      
      if (!userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
      
      console.log('Extracted userId from JWT:', userId)

      const client = await clientPromise
      const db = client.db()
      
            console.log('Searching for user with ObjectId:', new ObjectId(userId))
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Log the user data for debugging
      console.log('User data from MongoDB:', JSON.stringify(user, null, 2))

      // Return user data without sensitive information
      const userData = {
        id: user._id.toString(), // Convert ObjectId to string
        email: user.email,
        name: user.name || '',
        role: user.role || 'reporter',
        location: user.location || '',
        reportsCount: user.reportsCount || 0,
        isActive: user.isActive !== undefined ? user.isActive : true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // NGO-specific fields
        ...(user.role === 'ngo' && {
          orgName: user.orgName || '',
          description: user.description || '',
          licenseExpiry: user.licenseExpiry || '',
          licenseAuthority: user.licenseAuthority || '',
          verified: user.verified !== undefined ? user.verified : false
        })
      }

      console.log('Returning user data:', JSON.stringify(userData, null, 2))

      return NextResponse.json({ user: userData })
    } catch (jwtError) {
      console.error('Error decoding JWT token:', jwtError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
