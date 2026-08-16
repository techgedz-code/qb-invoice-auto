import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { turso } from '@/lib/turso';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_ID_PRO!,
  bookkeeper: process.env.STRIPE_PRICE_ID_BOOKKEEPER!,
};

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { plan } = body;

  if (!plan || !['pro', 'bookkeeper'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const user = await turso.execute({
    sql: 'SELECT id, email, name, stripe_customer_id FROM users WHERE clerk_user_id = ?',
    args: [userId],
  });

  if (!user.rows[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userData = user.rows[0];
  let customerId = userData.stripe_customer_id as string;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email as string,
      name: (userData.name as string) || undefined,
      metadata: { user_id: userData.id as string },
    });
    customerId = customer.id;

    await turso.execute({
      sql: 'UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?',
      args: [customerId, new Date().toISOString(), userData.id],
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICE_IDS[plan as keyof typeof PRICE_IDS],
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=subscription`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
    metadata: {
      user_id: userData.id as string,
      plan,
    },
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        user_id: userData.id as string,
        plan,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}