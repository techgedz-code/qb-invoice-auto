import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { turso, updateUserPlan, createAuditLog } from '@/lib/turso';
import { PLAN_LIMITS } from '@/lib/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId === process.env.STRIPE_PRICE_ID_PRO ? 'pro' : 
               priceId === process.env.STRIPE_PRICE_ID_BOOKKEEPER ? 'bookkeeper' : 'free';

  const limits = PLAN_LIMITS[plan];

  await turso.execute({
    sql: `UPDATE users SET stripe_customer_id = ?, stripe_subscription_id = ?, stripe_price_id = ?, plan = ?, invoices_limit = ?, updated_at = ? WHERE id = ?`,
    args: [customerId, subscriptionId, priceId, plan, limits.invoicesLimit, new Date().toISOString(), userId],
  });

  await createAuditLog({
    user_id: userId,
    action: 'subscription_created',
    resource_type: 'subscription',
    metadata: { plan, price_id: priceId, session_id: session.id },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId === process.env.STRIPE_PRICE_ID_PRO ? 'pro' : 
               priceId === process.env.STRIPE_PRICE_ID_BOOKKEEPER ? 'bookkeeper' : 'free';
  const limits = PLAN_LIMITS[plan];

  const user = await turso.execute({
    sql: 'SELECT id FROM users WHERE stripe_customer_id = ?',
    args: [customerId],
  });

  if (!user.rows[0]) return;

  const userId = user.rows[0].id as string;

  await turso.execute({
    sql: `UPDATE users SET stripe_subscription_id = ?, stripe_price_id = ?, plan = ?, invoices_limit = ?, updated_at = ? WHERE id = ?`,
    args: [subscription.id, priceId, plan, limits.invoicesLimit, new Date().toISOString(), userId],
  });

  await createAuditLog({
    user_id: userId,
    action: 'subscription_updated',
    resource_type: 'subscription',
    metadata: { plan, price_id: priceId, status: subscription.status },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await turso.execute({
    sql: 'SELECT id FROM users WHERE stripe_customer_id = ?',
    args: [customerId],
  });

  if (!user.rows[0]) return;

  const userId = user.rows[0].id as string;

  await turso.execute({
    sql: `UPDATE users SET stripe_subscription_id = NULL, stripe_price_id = NULL, plan = 'free', invoices_limit = ?, updated_at = ? WHERE id = ?`,
    args: [PLAN_LIMITS.free.invoicesLimit, new Date().toISOString(), userId],
  });

  await createAuditLog({
    user_id: userId,
    action: 'subscription_cancelled',
    resource_type: 'subscription',
    metadata: { subscription_id: subscription.id },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const user = await turso.execute({
    sql: 'SELECT id, email FROM users WHERE stripe_customer_id = ?',
    args: [customerId],
  });

  if (!user.rows[0]) return;

  const userId = user.rows[0].id as string;

  await createAuditLog({
    user_id: userId,
    action: 'payment_failed',
    resource_type: 'invoice',
    metadata: { invoice_id: invoice.id, amount_due: invoice.amount_due },
  });

  // TODO: Send email notification via Resend
}