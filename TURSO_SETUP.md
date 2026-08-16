# Turso Setup Instructions

## 1. Create Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Or via npm
npm install -g @turso/cli

# Login
turso auth login

# Create database
turso db create qb-invoice-auto

# Get connection info
turso db show qb-invoice-auto
```

## 2. Get Credentials

From `turso db show qb-invoice-auto`, copy:
- **Database URL** → `TURSO_DATABASE_URL` (looks like `libsql://qb-invoice-auto-yourorg.turso.io`)
- **Auth Token** → `TURSO_AUTH_TOKEN` (run `turso db tokens create qb-invoice-auto`)

## 3. Initialize Schema

```bash
# Option A: Run via Turso CLI
turso db shell qb-invoice-auto < supabase-schema.sql

# Option B: Run via Node script (add to package.json)
npm run db:init
```

## 4. Add to .env.local

```bash
TURSO_DATABASE_URL=libsql://qb-invoice-auto-yourorg.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 5. Deploy to Vercel

Add both env vars in Vercel dashboard → Environment Variables.

---

## Turso Free Tier Limits

- **9 GB storage** per database
- **1 billion row reads** per month
- **Unlimited databases** (no project limit!)
- **HTTP-based** - works great with serverless
- **SQLite-compatible** - familiar SQL

---

## Migration Notes (from Supabase)

| Supabase | Turso |
|----------|-------|
| `uuid_generate_v4()` | `lower(hex(randomblob(16)))` |
| `timestamptz` | `TEXT` (ISO 8601) |
| `jsonb` | `TEXT` (store JSON) |
| `NUMERIC(12,2)` | `REAL` |
| `BOOLEAN` | `INTEGER` (0/1) |
| RLS Policies | App-level auth (Clerk) |
| Triggers | App-level hooks |

---

## Useful Commands

```bash
# Open interactive shell
turso db shell qb-invoice-auto

# Run single query
turso db shell qb-invoice-auto "SELECT * FROM users;"

# Create auth token
turso db tokens create qb-invoice-auto --expiration never

# List databases
turso db list

# Delete database
turso db destroy qb-invoice-auto
```

---

## Local Development

For local dev, you can use a local SQLite file:

```bash
# Install libsql client locally
npm install @libsql/client

# Use local file
TURSO_DATABASE_URL=file:./local.db
TURSO_AUTH_TOKEN=
```

Or use Turso's local dev mode:
```bash
turso dev --port 8080
TURSO_DATABASE_URL=http://127.0.0.1:8080
```