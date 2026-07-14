import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not defined; using fallback localhost URI');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI || 'mongodb://127.0.0.1:27017/reliefaid', { bufferCommands: false })
      .then((m) => m)
      .catch((err) => {
        console.error('MongoDB connection failed:', err.message);
        cached.conn = null;
        cached.promise = null;
        return null;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
