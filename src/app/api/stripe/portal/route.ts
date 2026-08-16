import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { turso } from '@/lib/turso';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await turso.execute({
    sql: 'SELECT id, stripe_customer_id, stripe_subscription_id FROM users WHERE clerk_user_id = ?',
    args: [userId],
  });

  if (!user.rows[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userData = user.rows[0];

  if (!userData.stripe_customer_id || !userData.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripe_customer_id as string,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}