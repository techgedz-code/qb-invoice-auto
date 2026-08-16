import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { turso, createOrUpdateUser } from '@/lib/turso';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const headers = request.headers;
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(webhookSecret);

  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'user.created':
        await createOrUpdateUser({
          clerk_user_id: evt.data.id,
          email: evt.data.email_addresses?.[0]?.email_address || '',
          name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() || undefined,
          avatar_url: evt.data.image_url || undefined,
        });
        break;
      case 'user.updated':
        await createOrUpdateUser({
          clerk_user_id: evt.data.id,
          email: evt.data.email_addresses?.[0]?.email_address || '',
          name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() || undefined,
          avatar_url: evt.data.image_url || undefined,
        });
        break;
      case 'user.deleted':
        await turso.execute({
          sql: 'DELETE FROM users WHERE clerk_user_id = ?',
          args: [evt.data.id],
        });
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Clerk webhook handler error:', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}