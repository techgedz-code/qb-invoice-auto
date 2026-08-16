# QB Invoice Auto

Forward invoice emails → AI extracts data → One-click sync to QuickBooks Online.

## ��� Quick Start

### Prerequisites
- Node.js 20+
- npm/pnpm
- Git
- Accounts: Supabase, Clerk, Stripe, QuickBooks Developer, Cloudflare, Groq, Resend

### 1. Clone & Install
```bash
cd qb-invoice-auto
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Fill in all values (see Configuration below)
```

### 3. Database Setup (Supabase)
1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → Run `supabase-schema.sql`
3. Enable Row Level Security (already in schema)
4. Get Project URL & Anon Key from Settings > API

### 4. Authentication (Clerk)
1. Create app at [clerk.com](https://clerk.com)
2. Configure: Email/password, OAuth (Google, GitHub)
3. Set redirect URLs: `http://localhost:3000/sign-in`, `http://localhost:3000/sign-up`
4. Enable Webhooks: `https://your-app.vercel.app/api/clerk/webhook`
5. Get Publishable Key & Secret Key

### 5. QuickBooks (Intuit Developer)
1. Create app at [developer.intuit.com](https://developer.intuit.com)
2. Select "QuickBooks Online API"
3. Scopes: `com.intuit.quickbooks.accounting`, `openid`, `profile`, `email`, `phone`, `address`
4. Redirect URI: `http://localhost:3000/api/auth/callback/qb` (dev) / `https://your-app.vercel.app/api/auth/callback/qb` (prod)
5. Get Client ID & Client Secret
6. **Important**: Set environment to `sandbox` for testing

### 6. Payments (Stripe)
1. Create account at [stripe.com](https://stripe.com)
2. Create 3 prices (recurring monthly):
   - Pro: $12/mo → copy Price ID to `STRIPE_PRICE_ID_PRO`
   - Bookkeeper: $29/mo → copy Price ID to `STRIPE_PRICE_ID_BOOKKEEPER`
3. Enable Webhooks: `https://your-app.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
4. Get Secret Key & Webhook Secret

### 7. AI Extraction (Groq)
1. Get API key at [console.groq.com](https://console.groq.com)
2. Free tier: 30k tokens/min, 14.4k requests/day

### 8. Email (Resend)
1. Create account at [resend.com](https://resend.com)
2. Verify domain or use `onboarding@resend.dev` for testing
3. Get API key

### 9. Email Ingestion (Cloudflare)
1. Add domain to Cloudflare
2. Enable Email Routing
3. Create Email Worker (paste `cloudflare-email-worker.js`)
4. Set environment variables in Worker settings:
   - `API_URL`: `https://your-app.vercel.app/api/ingest`
   - `EMAIL_WORKER_SECRET`: Generate random string
5. Create custom address: `invoices@yourdomain.com` → route to worker
6. Add same `EMAIL_WORKER_SECRET` to your `.env.local`

### 10. Run Locally
```bash
npm run dev
# Visit http://localhost:3000
```

### 11. Deploy to Vercel
```bash
npm i -g vercel
vercel login
vercel --prod
# Add all env vars in Vercel dashboard
```

---

## ��� Project Structure

```
qb-invoice-auto/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Protected routes
│   │   │   └── dashboard/        # Main dashboard
│   │   ├── api/
│   │   │   ├── ingest/           # Email ingestion endpoint
│   │   │   ├── auth/qb/          # QuickBooks OAuth
│   │   │   ├── invoices/         # Invoice CRUD + sync
│   │   │   ├── stripe/           # Checkout, portal, webhooks
│   │   │   └── clerk/            # Clerk user sync
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/page.tsx      # Pricing page
│   │   └── layout.tsx            # Root layout
│   ├── components/
│   │   └── ui/                   # Shadcn-style components
│   ├── hooks/
│   │   └── use-toast.ts
│   └── lib/
│       ├── supabase.ts           # Supabase client
│       ├── types.ts              # TypeScript types
│       ├── utils.ts              # Helpers
│       ├── encryption.ts         # AES-256 for QB tokens
│       ├── groq-extraction.ts    # AI invoice parsing
│       ├── pdf-parser.ts         # PDF text extraction
│       └── quickbooks.ts         # QB API wrapper
├── cloudflare-email-worker.js    # Email ingestion worker
├── wrangler.toml                 # Cloudflare Worker config
├── supabase-schema.sql           # Database schema
��── .env.example                  # Environment template
```

---

## ������ Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | �� |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | �� |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) | �� |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | �� |
| `CLERK_SECRET_KEY` | Clerk secret key | �� |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret | �� |
| `QB_CLIENT_ID` | Intuit Developer App Client ID | �� |
| `QB_CLIENT_SECRET` | Intuit Developer App Client Secret | �� |
| `QB_REDIRECT_URI` | OAuth redirect URI | �� |
| `QB_ENVIRONMENT` | `sandbox` or `production` | �� |
| `GROQ_API_KEY` | Groq API key (free tier) | �� |
| `RESEND_API_KEY` | Resend API key | �� |
| `EMAIL_FROM` | From email for transactional emails | �� |
| `STRIPE_SECRET_KEY` | Stripe secret key | �� |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | �� |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | �� |
| `STRIPE_PRICE_ID_PRO` | Stripe Price ID for Pro plan | �� |
| `STRIPE_PRICE_ID_BOOKKEEPER` | Stripe Price ID for Bookkeeper plan | �� |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., `https://app.example.com`) | �� |
| `ENCRYPTION_KEY` | 32-char key for token encryption | �� |
| `EMAIL_WORKER_SECRET` | Shared secret for email worker auth | �� |

### Generate Encryption Key
```bash
# Run in terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ��� Email Flow

```
User forwards invoice → invoices@yourdomain.com
         │
         ��
Cloudflare Email Routing
         │
         ��
Cloudflare Email Worker (cloudflare-email-worker.js)
         │
         ��
POST /api/ingest (your Next.js API)
         │
         ��
1. Find user by recipient email
2. Check monthly limit
3. Parse PDF attachment (pdf-parse)
4. Extract data with Groq (Llama 3.1)
5. Save to Supabase (invoices table)
6. Increment user's monthly counter
7. Return invoice ID
```

---

## ��� QuickBooks OAuth Flow

```
User clicks "Connect QuickBooks"
         │
         ��
GET /api/auth/qb → Redirects to Intuit OAuth
         │
         ��
User authorizes on Intuit
         │
         ��
GET /api/auth/callback/qb?code=xxx&state=yyy
         │
         ��
1. Exchange code for tokens
2. Extract realmId from ID token
3. Encrypt & store tokens in Supabase (qb_tokens)
4. Redirect to dashboard with success
```

---

## ��� Database Schema

### `users`
- Synced from Clerk via webhook
- Tracks plan, limits, Stripe IDs

### `invoices`
- Raw email + parsed data
- QB sync status + review status
- Confidence score from AI

### `qb_tokens`
- Encrypted access/refresh tokens per realm
- Auto-refreshed before expiry

### `audit_logs`
- All user actions for compliance

---

## ��� Pricing Plans

| Feature | Free | Pro ($12/mo) | Bookkeeper ($29/mo) |
|---------|------|--------------|---------------------|
| Invoices/mo | 5 | Unlimited | Unlimited |
| AI Extraction | �� | �� | �� |
| QB Sync | �� | �� | �� |
| Audit Logs | 30 days | 1 year | 1 year |
| Priority Support | ��� | �� | �� |
| Webhooks | ��� | �� | �� |
| Multi-client | ��� | ��� | �� (10) |
| Team Seats | ��� | ��� | 3 |
| API Access | ��� | ��� | �� |

---

## ��� Testing

### Test Email Ingestion
```bash
# Use a test email with PDF attachment
# Forward to your Cloudflare address
# Check dashboard for parsed invoice
```

### Test QuickBooks Sync
1. Connect QB Sandbox in dashboard
2. Create test invoice in dashboard
3. Click "Push to QuickBooks"
4. Verify in QB Sandbox: `https://sandbox.qbo.intuit.com`

### Test Stripe Checkout
```bash
# Use Stripe test cards:
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
```

---

## ��� Deployment Checklist

- [ ] All env vars set in Vercel
- [ ] Supabase RLS policies active
- [ ] Clerk webhook configured
- [ ] Stripe webhook configured
- [ ] Cloudflare Email Worker deployed
- [ ] Email routing working (test with real email)
- [ ] QuickBooks production credentials (when ready)
- [ ] Custom domain configured
- [ ] SSL/HTTPS working
- [ ] Error monitoring (Sentry, etc.)

---

## ��� API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ingest` | Email ingestion (Cloudflare worker) |
| GET | `/api/auth/qb` | Initiate QB OAuth |
| GET | `/api/auth/callback/qb` | QB OAuth callback |
| GET | `/api/invoices` | List invoices (with filters) |
| PATCH | `/api/invoices` | Update invoice data |
| DELETE | `/api/invoices?id=` | Delete invoice |
| POST | `/api/invoices/sync` | Push invoice to QB |
| POST | `/api/stripe/checkout` | Create checkout session |
| POST | `/api/stripe/portal` | Create billing portal session |
| POST | `/api/stripe/webhook` | Stripe webhooks |
| POST | `/api/clerk/webhook` | Clerk user sync webhooks |

---

## ������ Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

---

## ��� Key Dependencies

- **Next.js 15** - App Router, Server Components
- **Supabase** - Postgres, Auth, Realtime
- **Clerk** - Authentication
- **Stripe** - Payments
- **Groq** - Free Llama 3.1 inference
- **pdf-parse** - PDF text extraction
- **Resend** - Transactional emails
- **Radix UI** - Accessible components
- **Tailwind CSS** - Styling
- **Zod** - Validation

---

## ��� Contributing

1. Fork the repo
2. Create feature branch
3. Make changes
4. Run `npm run lint` and `npm run build`
5. Submit PR

---

## ��� License

MIT License - feel free to use for your own projects.

---

## ��� Support

- **Documentation**: This README
- **Issues**: GitHub Issues
- **Email**: hello@qbinvoiceauto.com
- **Twitter**: [@qbinvoiceauto](https://twitter.com/qbinvoiceauto)

---

## ������ Roadmap

- [ ] Xero / Sage / NetSuite integrations
- [ ] OCR for scanned receipts (phone photos)
- [ ] Recurring invoice detection
- [ ] Vendor portal for invoice submission
- [ ] Mobile app for receipt capture
- [ ] Advanced reporting & analytics