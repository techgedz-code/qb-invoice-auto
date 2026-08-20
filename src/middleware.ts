import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")
  const isOnApiAuth = req.nextUrl.pathname.startsWith("/api/auth")
  const isPublicRoute = ["/", "/pricing", "/sign-in", "/sign-up", "/api/ingest", "/api/clerk/webhook", "/api/stripe/webhook", "/api/auth/qb", "/api/auth/callback/qb"].includes(req.nextUrl.pathname)

  if (isOnApiAuth) {
    return
  }

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/sign-in", req.nextUrl))
  }

  if ((req.nextUrl.pathname === "/sign-in" || req.nextUrl.pathname === "/sign-up") && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}