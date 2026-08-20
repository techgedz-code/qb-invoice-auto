import { createClient } from "@libsql/client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Simple test query
    const result = await client.execute("SELECT 1 as test")
    
    return NextResponse.json({ 
      success: true, 
      message: "Turso connection successful",
      result: result.rows
    })
  } catch (error) {
    console.error("Turso connection error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}