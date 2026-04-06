import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Demo Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'demo@hollywood.ai' },
      },
      async authorize(credentials) {
        // In production, verify against DB + password hash.
        // For dev/demo, accept any email and create a session.
        const email = credentials?.email as string;
        if (!email) return null;

        return {
          id: email,
          email,
          name: email.split('@')[0],
        };
      },
    }),
    // GitHub OAuth — only active when AUTH_GITHUB_ID + AUTH_GITHUB_SECRET are set
    GitHub,
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
