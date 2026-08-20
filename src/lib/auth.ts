import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { users } from "./schema"
import { eq } from "drizzle-orm"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

const db = drizzle(client, {
  schema: {
    users,
  },
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    authorized: async ({ auth }) => !!auth?.user,
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign-in
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/dashboard`
      }
      return baseUrl
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          console.log("[auth] signIn callback for:", user.email)
          // Upsert user in Turso database
          const existingUsers = await db.select().from(users).where(eq(users.email, user.email!))
          
          if (existingUsers.length === 0) {
            const newUserId = user.id || crypto.randomUUID()
            await db.insert(users).values({
              id: newUserId,
              email: user.email!,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
            })
            console.log("[auth] Created new user:", newUserId)
          } else {
            // Update existing user
            await db.update(users)
              .set({
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(users.email, user.email!))
            console.log("[auth] Updated existing user:", user.email)
          }
        } catch (error) {
          console.error("[auth] Error upserting user:", error)
          // Don't block sign-in on DB errors
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Persist user ID and provider account ID to token
      if (user) {
        token.id = user.id
      }
      if (account) {
        token.providerAccountId = account.providerAccountId
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
})