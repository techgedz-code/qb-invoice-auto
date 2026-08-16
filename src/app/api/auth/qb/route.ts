import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { turso } from '@/lib/turso';

const QB_CLIENT_ID = process.env.QB_CLIENT_ID!;
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET!;
const QB_REDIRECT_URI = process.env.QB_REDIRECT_URI!;
const QB_ENVIRONMENT = process.env.QB_ENVIRONMENT || 'sandbox';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/sign-in`);
  }

  const user = await turso.execute({
    sql: 'SELECT id FROM users WHERE clerk_user_id = ?',
    args: [userId],
  });

  if (!user.rows[0]) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=user_not_found`);
  }

  const state = Buffer.from(JSON.stringify({ userId: user.rows[0].id })).toString('base64');
  
  const scopes = [
    'com.intuit.quickbooks.accounting',
    'openid',
    'profile',
    'email',
    'phone',
    'address',
  ].join(' ');

  const authUrl = `https://appcenter.intuit.com/connect/oauth2?` + new URLSearchParams({
    client_id: QB_CLIENT_ID,
    redirect_uri: QB_REDIRECT_URI,
    scope: scopes,
    response_type: 'code',
    state: state,
    access_type: 'offline',
  }).toString();

  return NextResponse.redirect(authUrl);
}