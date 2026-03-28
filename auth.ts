import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: '/login',
    newUser: '/signup',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  events: {
    // Grant 1 free credit to new users created via OAuth
    async createUser({ user }) {
      if (user.id) {
        await prisma.$transaction(async (tx: typeof prisma) => {
          await tx.user.update({
            where: { id: user.id! },
            data: { credits: 1 },
          });
          await tx.creditLedger.create({
            data: {
              userId: user.id!,
              delta: 1,
              balance: 1,
              reason: 'signup_bonus',
              note: 'Free trial credit on signup (Google)',
            },
          });
        });
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch credits from DB — OAuth users may not have credits on the user object
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id! },
          select: { credits: true },
        });
        token.credits = dbUser?.credits ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { credits?: number }).credits = token.credits as number;
      }
      return session;
    },
  },
});
