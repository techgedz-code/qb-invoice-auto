import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { turso, getInvoiceById, updateInvoice, createAuditLog } from '@/lib/turso';
import { findOrCreateVendor, findOrCreateItem, createInvoice as createQBInvoice } from '@/lib/quickbooks';

export async function POST(request: NextRequest) {
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
  const { invoiceId } = body;

  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
  }

  // Get invoice
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice || invoice.user_id !== internalUserId) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoice.qb_sync_status === 'synced') {
    return NextResponse.json({ error: 'Already synced' }, { status: 400 });
  }

  // Get QB tokens
  const tokens = await turso.execute({
    sql: 'SELECT realm_id FROM qb_tokens WHERE user_id = ? LIMIT 1',
    args: [internalUserId],
  });

  if (!tokens.rows[0]) {
    return NextResponse.json({ error: 'QuickBooks not connected' }, { status: 400 });
  }

  const realmId = tokens.rows[0].realm_id as string;

  try {
    // Find or create vendor
    const vendorId = await findOrCreateVendor(
      internalUserId,
      realmId,
      (invoice.vendor_name as string) || 'Unknown Vendor',
      (invoice.vendor_email as string) || undefined
    );

    // Build invoice lines
    const lines: any[] = [];
    const invoiceLineItems = (invoice.line_items as unknown as any[]) || [];
    for (const item of invoiceLineItems) {
      const itemId = await findOrCreateItem(
        internalUserId,
        realmId,
        item.description,
        item.unit_price
      );

      lines.push({
        DetailType: 'SalesItemLineDetail' as const,
        Amount: item.amount,
        Description: item.description,
        SalesItemLineDetail: {
          ItemRef: { value: itemId, name: item.description },
          Qty: item.quantity,
          UnitPrice: item.unit_price,
        },
      });
    }

    // Create QB invoice
    const qbInvoiceId = await createQBInvoice(internalUserId, realmId, {
      Line: lines,
      CustomerRef: { value: vendorId },
      TxnDate: invoice.invoice_date as string,
      DueDate: (invoice.due_date as string) || undefined,
      PrivateNote: `Synced from QB Invoice Auto - Original: ${invoice.invoice_number}`,
      DocNumber: invoice.invoice_number as string,
    });

    // Update invoice with QB ID
    await updateInvoice(invoiceId, internalUserId, {
      qb_invoice_id: qbInvoiceId,
      qb_sync_status: 'synced',
      qb_synced_at: new Date().toISOString(),
      review_status: 'approved',
      reviewed_at: new Date().toISOString(),
    });

    // Log audit
    await createAuditLog({
      user_id: internalUserId,
      action: 'invoice_synced',
      resource_type: 'invoice',
      resource_id: invoiceId,
      metadata: { qb_invoice_id: qbInvoiceId },
    });

    return NextResponse.json({ success: true, qbInvoiceId });

  } catch (error: any) {
    console.error('QB sync error:', error);
    
    await updateInvoice(invoiceId, internalUserId, {
      qb_sync_status: 'failed',
      qb_sync_error: error.message,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}