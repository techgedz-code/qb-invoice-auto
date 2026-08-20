import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export async function GET() {
  try {
    // Test NextAuth initialization
    const auth = NextAuth({
      debug: true,
      providers: [
        Google({
          clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        }),
      ],
      secret: process.env.AUTH_SECRET,
      session: { strategy: "jwt" },
    })
    
    return NextResponse.json({
      success: true,
      message: "NextAuth initialized successfully",
      handlers: !!auth.handlers,
      auth: !!auth.auth,
      signIn: !!auth.signIn,
      signOut: !!auth.signOut,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}