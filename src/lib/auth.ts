import NextAuth, { DefaultSession, NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role, SubscriptionTier } from "@prisma/client";

// Extend default session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      subscriptionTier: SubscriptionTier;
      credits: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    subscriptionTier: SubscriptionTier;
    credits: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    subscriptionTier: SubscriptionTier;
    credits: number;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID! as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET! as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = credentialsSchema.parse(credentials);

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
            credits: user.credits,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        if (user.id) {
          token.id = user.id;
        }
        token.role = user.role;
        token.subscriptionTier = user.subscriptionTier;
        token.credits = user.credits;
      }

      // Handle session updates (e.g., credit changes)
      if (trigger === "update" && session) {
        token.credits = session.credits;
        token.subscriptionTier = session.subscriptionTier;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.subscriptionTier = token.subscriptionTier;
        session.user.credits = token.credits;
      }
      return session;
    },
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
