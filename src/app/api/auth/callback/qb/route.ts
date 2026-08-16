import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { encrypt } from '@/lib/encryption';

const QB_CLIENT_ID = process.env.QB_CLIENT_ID!;
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET!;
const QB_REDIRECT_URI = process.env.QB_REDIRECT_URI!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=qb_auth_failed&details=${errorDescription}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=missing_params`);
  }

  try {
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decoded.userId;
    } catch {
      return NextResponse.redirect(`${APP_URL}/dashboard?error=invalid_state`);
    }

    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: QB_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${APP_URL}/dashboard?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    
    let realmId = '';
    if (tokens.id_token) {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
      realmId = payload.realmId || '';
    }

    if (!realmId) {
      return NextResponse.redirect(`${APP_URL}/dashboard?error=no_realm_id`);
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    await turso.execute({
      sql: `INSERT INTO qb_tokens (id, user_id, realm_id, access_token_encrypted, refresh_token_encrypted, expires_at, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, realm_id) DO UPDATE SET
              access_token_encrypted = excluded.access_token_encrypted,
              refresh_token_encrypted = excluded.refresh_token_encrypted,
              expires_at = excluded.expires_at,
              updated_at = excluded.updated_at`,
      args: [
        crypto.randomUUID(),
        userId,
        realmId,
        encrypt(tokens.access_token),
        encrypt(tokens.refresh_token),
        expiresAt.toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });

    // Log audit
    await turso.execute({
      sql: `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, metadata, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        userId,
        'qb_connected',
        'qb_connection',
        realmId,
        JSON.stringify({ realm_id: realmId }),
        new Date().toISOString(),
      ],
    });

    return NextResponse.redirect(`${APP_URL}/dashboard?success=qb_connected`);

  } catch (error) {
    console.error('QB callback error:', error);
    return NextResponse.redirect(`${APP_URL}/dashboard?error=callback_failed`);
  }
}