import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { turso, getInvoicesByUser } from '@/lib/turso';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const internalUserId = session.user.id;

  const user = await turso.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [internalUserId],
  });

  if (!user.rows[0]) {
    redirect('/sign-in');
  }

  const userData = user.rows[0];

  // Get invoices (returns rows already parsed with line_items as JSON)
  const invoices = await getInvoicesByUser(internalUserId, { limit: 50 }) as any[];

  // Get QB connection status
  const qbTokens = await turso.execute({
    sql: 'SELECT realm_id FROM qb_tokens WHERE user_id = ? LIMIT 1',
    args: [internalUserId],
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter((i: any) => i.qb_sync_status === 'pending').length,
    synced: invoices.filter((i: any) => i.qb_sync_status === 'synced').length,
    failed: invoices.filter((i: any) => i.qb_sync_status === 'failed').length,
    thisMonth: invoices.filter((i: any) => 
      new Date(i.created_at as string) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    ).length,
  };

  return (
    <DashboardClient
      user={{
        id: internalUserId,
        email: (userData.email as string) || '',
        name: (userData.name as string) || null,
        plan: (userData.plan as 'free' | 'pro' | 'bookkeeper') || 'free',
        invoices_limit: userData.invoices_limit as number,
        invoices_used_this_month: userData.invoices_used_this_month as number,
      }}
      invoices={invoices}
      stats={stats}
      qbConnected={!!qbTokens.rows[0]}
    />
  );
}