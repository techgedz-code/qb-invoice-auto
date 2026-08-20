import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@libsql/client"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
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
      if (account?.provider === "google" && user.email) {
        try {
          console.log("[auth] signIn callback for:", user.email)
          // Use raw SQL to avoid Drizzle schema mismatch
          const existingUsers = await client.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [user.email],
          })
          
          if (existingUsers.rows.length === 0) {
            const newUserId = user.id || crypto.randomUUID()
            await client.execute({
              sql: `INSERT INTO users (id, email, name, image, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [newUserId, user.email, user.name || null, user.image || null, Date.now(), Date.now(), Date.now()],
            })
            console.log("[auth] Created new user:", newUserId)
          } else {
            const userId = existingUsers.rows[0].id as string
            await client.execute({
              sql: `UPDATE users SET name = ?, image = ?, email_verified = ?, updated_at = ? WHERE id = ?`,
              args: [user.name || null, user.image || null, Date.now(), Date.now(), userId],
            })
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