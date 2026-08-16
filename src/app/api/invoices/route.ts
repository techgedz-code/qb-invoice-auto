import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { turso, getInvoicesByUser, updateInvoice, deleteInvoice, createAuditLog } from '@/lib/turso';
import { z } from 'zod';

const invoiceUpdateSchema = z.object({
  vendor_name: z.string().optional(),
  vendor_email: z.string().email().optional().nullable(),
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
  due_date: z.string().optional().nullable(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  total_amount: z.number().optional(),
  currency: z.string().optional(),
  line_items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    amount: z.number(),
    sku: z.string().optional().nullable(),
  })).optional(),
  review_status: z.enum(['pending', 'approved', 'rejected', 'edited']).optional(),
});

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's internal ID
  const user = await turso.execute({
    sql: 'SELECT id FROM users WHERE clerk_user_id = ?',
    args: [userId],
  });

  if (!user.rows[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const internalUserId = user.rows[0].id as string;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const reviewStatus = searchParams.get('review_status');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const invoices = await getInvoicesByUser(internalUserId, {
    status: status || undefined,
    reviewStatus: reviewStatus || undefined,
    limit,
    offset,
  });

  return NextResponse.json({ invoices });
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await turso.execute({
    sql: 'SELECT id FROM users WHERE clerk_user_id = ?',
    args: [userId],
  });

  if (!user.rows[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const internalUserId = user.rows[0].id as string;

  const body = await request.json();
  const { invoiceId, ...updates } = body;

  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
  }

  const parsed = invoiceUpdateSchema.safeParse(updates);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const invoice = await updateInvoice(invoiceId, internalUserId, {
    ...parsed.data,
    vendor_email: parsed.data.vendor_email ?? undefined,
    due_date: parsed.data.due_date ?? undefined,
    reviewed_at: parsed.data.review_status ? new Date().toISOString() : undefined,
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Log audit
  await createAuditLog({
    user_id: internalUserId,
    action: 'invoice_updated',
    resource_type: 'invoice',
    resource_id: invoiceId,
    metadata: { changes: parsed.data },
  });

  return NextResponse.json({ invoice });
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await turso.execute({
    sql: 'SELECT id FROM users WHERE clerk_user_id = ?',
    args: [userId],
  });

  if (!user.rows[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const internalUserId = user.rows[0].id as string;

  const searchParams = request.nextUrl.searchParams;
  const invoiceId = searchParams.get('id');

  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
  }

  await deleteInvoice(invoiceId, internalUserId);

  return NextResponse.json({ success: true });
}