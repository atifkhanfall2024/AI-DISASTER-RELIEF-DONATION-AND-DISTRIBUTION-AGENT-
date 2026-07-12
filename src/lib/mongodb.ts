import mongoose from 'mongoose';
import dns from 'node:dns';

// Some ISP / phone-hotspot DNS configs fail the SRV lookup that mongodb+srv://
// requires (Node throws `querySrv ECONNREFUSED`) even when the internet works.
// Prefer reliable public resolvers, keeping the system ones as fallback.
try {
  const existing = dns.getServers();
  dns.setServers([...new Set(['8.8.8.8', '1.1.1.1', ...existing])]);
} catch {
  /* setServers can throw on some platforms — safe to ignore */
}

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
