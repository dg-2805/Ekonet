// lib/mongodb.ts - Updated MongoDB connection with SSL fix

import { MongoClient, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

// Configure MongoDB options to handle SSL issues
const options: MongoClientOptions = {
  // SSL/TLS Configuration
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  
  // Connection pool settings
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // For MongoDB Atlas, these are usually not needed but can help
  // ssl: true,
  // sslValidate: true,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Alternative connection with manual SSL configuration
export const connectToDatabase = async (): Promise<MongoClient> => {
  try {
    const client = await clientPromise;
    
    // Test the connection
    await client.db().admin().ping();
    console.log('Successfully connected to MongoDB');
    
    return client;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    
    // If SSL error, try with different SSL settings
    if (error instanceof Error && error.message.includes('SSL')) {
      console.log('Attempting connection with alternative SSL settings...');
      
      const alternativeOptions: MongoClientOptions = {
        tls: true,
        tlsInsecure: true, // Only for testing - remove in production
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      };
      
      try {
        const alternativeClient = new MongoClient(uri, alternativeOptions);
        await alternativeClient.connect();
        await alternativeClient.db().admin().ping();
        console.log('Connected with alternative SSL settings');
        return alternativeClient;
      } catch (alternativeError) {
        console.error('Alternative connection also failed:', alternativeError);
        throw error; // Throw original error
      }
    }
    
    throw error;
  }
};

// Export the default client promise
export default clientPromise;