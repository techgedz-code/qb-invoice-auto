import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const tursoUrl = process.env.TURSO_DATABASE_URL!;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN!;

if (!tursoUrl || !tursoAuthToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local');
  process.exit(1);
}

const turso = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

const statements = [
  'PRAGMA foreign_keys = ON;',
  `CREATE TABLE IF NOT EXISTS users (
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
  );`,
  `CREATE TABLE IF NOT EXISTS invoices (
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
  );`,
  `CREATE TABLE IF NOT EXISTS qb_tokens (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    realm_id TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, realm_id)
  );`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    metadata TEXT DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );`,
  'CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(qb_sync_status);',
  'CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_qb_tokens_user_id ON qb_tokens(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);',
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
];

async function main() {
  console.log('Initializing Turso database...');
  console.log(`Database: ${tursoUrl}`);

  try {
    for (const sql of statements) {
      if (!sql.trim()) continue;
      await turso.execute(sql);
      console.log(`✅ ${sql.substring(0, 60).replace(/\n/g, ' ')}...`);
    }

    console.log('\n🎉 Database schema initialized successfully!');
    
    // Verify tables
    const tables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables created:', tables.rows.map(r => r.name).join(', '));

  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    process.exit(1);
  } finally {
    await turso.close();
  }
}

main();