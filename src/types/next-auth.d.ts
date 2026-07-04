import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'donor' | 'focal' | 'admin';
      name?: string | null;
      email?: string | null;
    };
  }
  interface User {
    id: string;
    role: 'donor' | 'focal' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'donor' | 'focal' | 'admin';
  }
}
