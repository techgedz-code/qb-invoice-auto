import { createClient } from '@libsql/client';

const tursoUrl = process.env.TURSO_DATABASE_URL!;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN!;

export const turso = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

// Helper to run multiple statements in a transaction
export async function tursoTransaction(statements: { sql: string; args?: any[] }[]) {
  return turso.batch(statements as any);
}

// Initialize schema (run once on startup or via script)
export async function initializeSchema() {
  const schema = `
    -- Enable foreign keys
    PRAGMA foreign_keys = ON;

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      clerk_user_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'bookkeeper')),
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_price_id TEXT,
      invoices_used_this_month INTEGER DEFAULT 0,
      invoices_limit INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Invoices table
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      raw_email_text TEXT,
      raw_pdf_base64 TEXT,
      vendor_name TEXT,
      vendor_email TEXT,
      invoice_number TEXT,
      invoice_date TEXT,
      due_date TEXT,
      subtotal REAL,
      tax_amount REAL,
      total_amount REAL,
      currency TEXT DEFAULT 'USD',
      line_items TEXT DEFAULT '[]',
      qb_invoice_id TEXT,
      qb_sync_status TEXT DEFAULT 'pending' CHECK (qb_sync_status IN ('pending', 'synced', 'failed', 'skipped')),
      qb_sync_error TEXT,
      qb_synced_at TEXT,
      review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'edited')),
      reviewed_at TEXT,
      source_email TEXT,
      parsed_by_ai INTEGER DEFAULT 1,
      confidence_score REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- QB Tokens table
    CREATE TABLE IF NOT EXISTS qb_tokens (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      realm_id TEXT NOT NULL,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, realm_id)
    );

    -- Audit logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      metadata TEXT DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(qb_sync_status);
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_qb_tokens_user_id ON qb_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  const statements = schema.split(';').filter(s => s.trim()).map(sql => ({ sql: sql.trim() + ';' }));
  await turso.batch(statements);
  console.log('Turso schema initialized');
}

// User helpers
export async function getUserByClerkId(clerkUserId: string) {
  const result = await turso.execute({
    sql: 'SELECT * FROM users WHERE clerk_user_id = ?',
    args: [clerkUserId],
  });
  return result.rows[0] || null;
}

export async function getUserById(userId: string) {
  const result = await turso.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });
  return result.rows[0] || null;
}

export async function getUserByEmail(email: string) {
  const result = await turso.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  });
  return result.rows[0] || null;
}

export async function createOrUpdateUser(data: {
  clerk_user_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}) {
  const existing = await getUserByClerkId(data.clerk_user_id);
  const now = new Date().toISOString();

  if (existing) {
    await turso.execute({
      sql: `UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = ? WHERE clerk_user_id = ?`,
      args: [data.email, data.name || null, data.avatar_url || null, now, data.clerk_user_id],
    });
    return getUserByClerkId(data.clerk_user_id);
  }

  const id = crypto.randomUUID();
  await turso.execute({
    sql: `INSERT INTO users (id, clerk_user_id, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.clerk_user_id, data.email, data.name || null, data.avatar_url || null, now, now],
  });
  return getUserById(id);
}

export async function updateUserPlan(userId: string, plan: string, limits: { invoicesLimit: number; priceId?: string }) {
  const now = new Date().toISOString();
  await turso.execute({
    sql: `UPDATE users SET plan = ?, invoices_limit = ?, stripe_price_id = ?, updated_at = ? WHERE id = ?`,
    args: [plan, limits.invoicesLimit, limits.priceId || null, now, userId],
  });
}

export async function incrementInvoiceUsage(userId: string) {
  await turso.execute({
    sql: `UPDATE users SET invoices_used_this_month = invoices_used_this_month + 1, updated_at = ? WHERE id = ?`,
    args: [new Date().toISOString(), userId],
  });
}

// Invoice helpers
export async function createInvoice(data: {
  user_id: string;
  raw_email_text?: string;
  raw_pdf_base64?: string;
  vendor_name?: string;
  vendor_email?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  currency?: string;
  line_items: any[];
  source_email?: string;
  parsed_by_ai?: boolean;
  confidence_score?: number;
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await turso.execute({
    sql: `INSERT INTO invoices (id, user_id, raw_email_text, raw_pdf_base64, vendor_name, vendor_email, invoice_number, invoice_date, due_date, subtotal, tax_amount, total_amount, currency, line_items, source_email, parsed_by_ai, confidence_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.user_id,
      data.raw_email_text || null,
      data.raw_pdf_base64 || null,
      data.vendor_name || null,
      data.vendor_email || null,
      data.invoice_number || null,
      data.invoice_date || null,
      data.due_date || null,
      data.subtotal || null,
      data.tax_amount || null,
      data.total_amount || null,
      data.currency || 'USD',
      JSON.stringify(data.line_items),
      data.source_email || null,
      data.parsed_by_ai ? 1 : 0,
      data.confidence_score || null,
      now,
      now,
    ],
  });
  return getInvoiceById(id);
}

export async function getInvoiceById(id: string) {
  const result = await turso.execute({
    sql: 'SELECT * FROM invoices WHERE id = ?',
    args: [id],
  });
  return result.rows[0] || null;
}

export async function getInvoicesByUser(userId: string, options?: { status?: string; reviewStatus?: string; limit?: number; offset?: number }) {
  let sql = 'SELECT * FROM invoices WHERE user_id = ?';
  const args: any[] = [userId];

  if (options?.status) {
    sql += ' AND qb_sync_status = ?';
    args.push(options.status);
  }
  if (options?.reviewStatus) {
    sql += ' AND review_status = ?';
    args.push(options.reviewStatus);
  }

  sql += ' ORDER BY created_at DESC';
  
  if (options?.limit) {
    sql += ' LIMIT ?';
    args.push(options.limit);
    if (options?.offset) {
      sql += ' OFFSET ?';
      args.push(options.offset);
    }
  }

  const result = await turso.execute({ sql, args });
  return result.rows.map(row => ({
    ...row,
    line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
  }));
}

export async function updateInvoice(invoiceId: string, userId: string, updates: Partial<{
  vendor_name: string;
  vendor_email: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  line_items: any[];
  review_status: string;
  qb_sync_status: string;
  qb_sync_error: string;
  qb_invoice_id: string;
  qb_synced_at: string;
  reviewed_at: string;
}>) {
  const now = new Date().toISOString();
  const setParts: string[] = ['updated_at = ?'];
  const args: any[] = [now];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (key === 'line_items') {
        setParts.push(`${snakeKey} = ?`);
        args.push(JSON.stringify(value));
      } else {
        setParts.push(`${snakeKey} = ?`);
        args.push(value);
      }
    }
  }

  args.push(invoiceId, userId);
  await turso.execute({
    sql: `UPDATE invoices SET ${setParts.join(', ')} WHERE id = ? AND user_id = ?`,
    args,
  });
  return getInvoiceById(invoiceId);
}

export async function deleteInvoice(invoiceId: string, userId: string) {
  await turso.execute({
    sql: 'DELETE FROM invoices WHERE id = ? AND user_id = ?',
    args: [invoiceId, userId],
  });
}

// QB Token helpers
export async function getQBTokens(userId: string, realmId: string) {
  const result = await turso.execute({
    sql: 'SELECT * FROM qb_tokens WHERE user_id = ? AND realm_id = ?',
    args: [userId, realmId],
  });
  return result.rows[0] || null;
}

export async function upsertQBTokens(data: {
  user_id: string;
  realm_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
}) {
  const existing = await getQBTokens(data.user_id, data.realm_id);
  const now = new Date().toISOString();

  if (existing) {
    await turso.execute({
      sql: `UPDATE qb_tokens SET access_token_encrypted = ?, refresh_token_encrypted = ?, expires_at = ?, updated_at = ? WHERE user_id = ? AND realm_id = ?`,
      args: [data.access_token_encrypted, data.refresh_token_encrypted, data.expires_at, now, data.user_id, data.realm_id],
    });
  } else {
    const id = crypto.randomUUID();
    await turso.execute({
      sql: `INSERT INTO qb_tokens (id, user_id, realm_id, access_token_encrypted, refresh_token_encrypted, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.user_id, data.realm_id, data.access_token_encrypted, data.refresh_token_encrypted, data.expires_at, now, now],
    });
  }
}

// Audit log helpers
export async function createAuditLog(data: {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
}) {
  const id = crypto.randomUUID();
  await turso.execute({
    sql: `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, metadata, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.user_id,
      data.action,
      data.resource_type,
      data.resource_id || null,
      JSON.stringify(data.metadata || {}),
      data.ip_address || null,
      data.user_agent || null,
      new Date().toISOString(),
    ],
  });
}