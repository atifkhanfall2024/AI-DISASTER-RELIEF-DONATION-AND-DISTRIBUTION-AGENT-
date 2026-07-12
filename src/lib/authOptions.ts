import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase();

        // Throttle brute-force: 5 attempts per email per 15 min. The counter is
        // cleared on a successful login so a legitimate user is never locked out.
        const key = `login:${email}`;
        const gate = checkRateLimit(key, 5, 15 * 60 * 1000);
        if (!gate.allowed) {
          throw new Error(`Too many login attempts. Please try again in ${gate.retryAfterSec}s.`);
        }

        await connectDB();
        const user = await User.findOne({ email });
        if (!user) return null;
        // OAuth-only accounts have no password — they must sign in with Google.
        if (!user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        resetRateLimit(key);
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          focalStatus: user.focalStatus
        } as any;
      }
    }),
    // Google sign-in bridged through Supabase OAuth: the browser completes the
    // Supabase Google flow, then hands us the Supabase access token. We verify it
    // server-side and map the Google identity to a MongoDB user + NextAuth session.
    CredentialsProvider({
      id: 'supabase',
      name: 'Google',
      credentials: { access_token: { label: 'access_token', type: 'text' } },
      async authorize(credentials) {
        const token = credentials?.access_token;
        if (!token) return null;
        const { data, error } = await supabaseAdmin().auth.getUser(token);
        if (error || !data?.user?.email) return null;

        const email = data.user.email.toLowerCase();
        const meta = (data.user.user_metadata || {}) as Record<string, string>;
        const name = meta.full_name || meta.name || email.split('@')[0];

        await connectDB();
        let user = await User.findOne({ email });
        if (!user) {
          // First Google sign-in provisions a donor account (no password).
          user = await User.create({ name, email, role: 'donor', provider: 'google' });
        }
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          focalStatus: user.focalStatus
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.focalStatus = (user as any).focalStatus;
      }
      if (trigger === 'update' && session?.focalStatus) {
        token.focalStatus = session.focalStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).focalStatus = token.focalStatus;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
