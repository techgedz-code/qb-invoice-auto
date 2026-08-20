import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { users, accounts, sessions, verificationTokens } from "@/lib/schema"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    const db = drizzle(client, {
      schema: {
        users,
        accounts,
        sessions,
        verificationTokens,
      },
    })

    const adapter = DrizzleAdapter(db)

    // Test creating a user
    const testUser = await adapter.createUser?.({
      id: "test-user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Test getting the user
    const foundUser = await adapter.getUser?.("test-user-123")

    // Test creating an account
    const testAccount = await adapter.linkAccount?.({
      userId: "test-user-123",
      type: "oauth",
      provider: "google",
      providerAccountId: "google-123",
      accessToken: "test-token",
    })

    // Clean up
    await adapter.deleteUser?.("test-user-123")

    return NextResponse.json({
      success: true,
      message: "Drizzle adapter works!",
      testUser,
      foundUser,
      testAccount,
    })
  } catch (error) {
    console.error("Debug auth error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}