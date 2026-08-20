import { createClient } from "@libsql/client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Test raw SQL queries on the tables
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
    
    const users = await client.execute("SELECT * FROM users LIMIT 5")
    const accounts = await client.execute("SELECT * FROM accounts LIMIT 5")
    const sessions = await client.execute("SELECT * FROM sessions LIMIT 5")

    return NextResponse.json({
      success: true,
      tables: tables.rows.map(r => r.name),
      users: users.rows,
      accounts: accounts.rows,
      sessions: sessions.rows,
    })
  } catch (error) {
    console.error("Test adapter error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}