import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    
    return NextResponse.json({
      deployed: true,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
      env: process.env.NODE_ENV,
      hasGoogleClientId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      session: session ? { user: session.user } : null,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}