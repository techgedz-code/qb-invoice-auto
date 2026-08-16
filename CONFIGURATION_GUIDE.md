# Configuration Guide - Direct Links & Steps

## ��� Open These Tabs in Order

### 1. **Supabase** (Database + Auth) - 10 min
**���� [supabase.com](https://supabase.com)** → Sign up/Login → **New Project**
- Name: `qb-invoice-auto`
- Region: Choose closest to you
- Password: Save this! (Database password)
- **Wait 2 min for provisioning**
- Go to **Settings → API** → Copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key (secret) → `SUPABASE_SERVICE_ROLE_KEY`
- Go to **SQL Editor** → **New Query** → Paste `supabase-schema.sql` → **Run**

---

### 2. **Clerk** (Authentication) - 10 min
**���� [clerk.com](https://clerk.com)** → Sign up/Login → **Create Application**
- Name: `QB Invoice Auto`
- **Sign-in options**: Email, Google, GitHub (recommended)
- **Redirect URLs** (Settings → Domains):
  - Development: `http://localhost:3000`
  - Production: `https://your-app.vercel.app`
- **Webhooks** (Settings → Webhooks):
  - Endpoint: `https://your-app.vercel.app/api/clerk/webhook`
  - Events: `user.created`, `user.updated`, `user.deleted`
  - Copy **Signing Secret** → `CLERK_WEBHOOK_SECRET`
- **API Keys** (Settings → API Keys):
  - Publishable Key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Secret Key → `CLERK_SECRET_KEY`

---

### 3. **Intuit Developer** (QuickBooks API) - 15 min
**���� [developer.intuit.com](https://developer.intuit.com)** → Sign in → **My Apps** → **Create App**
- Select: **QuickBooks Online API**
- App Name: `QB Invoice Auto`
- **Scopes** (required):
  - `com.intuit.quickbooks.accounting`
  - `openid`
  - `profile`
  - `email`
  - `phone`
  - `address`
- **Redirect URI**:
  - Dev: `http://localhost:3000/api/auth/callback/qb`
  - Prod: `https://your-app.vercel.app/api/auth/callback/qb`
- **Keys & OAuth**:
  - Copy **Client ID** → `QB_CLIENT_ID`
  - Copy **Client Secret** → `QB_CLIENT_SECRET`
- **Environment**: Start with **Sandbox** (toggle in dashboard)

---

### 4. **Stripe** (Payments) - 10 min
**���� [dashboard.stripe.com](https://dashboard.stripe.com)** → **Test Mode** (toggle top-right)
- **Products** → **Add Product**:
  - Name: `Pro Plan` → Price: `$12/mo` → Recurring monthly → Copy **Price ID** → `STRIPE_PRICE_ID_PRO`
  - Name: `Bookkeeper Plan` → Price: `$29/mo` → Recurring monthly → Copy **Price ID** → `STRIPE_PRICE_ID_BOOKKEEPER`
- **Developers → Webhooks** → **Add Endpoint**:
  - URL: `https://your-app.vercel.app/api/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
  - Copy **Signing Secret** → `STRIPE_WEBHOOK_SECRET`
- **API Keys**:
  - Publishable Key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Secret Key → `STRIPE_SECRET_KEY`

---

### 5. **Groq** (Free AI) - 2 min
**���� [console.groq.com](https://console.groq.com)** → **API Keys** → **Create API Key**
- Name: `qb-invoice-auto`
- Copy key → `GROQ_API_KEY`
- **Free tier**: 30k tokens/min, 14.4k requests/day

---

### 6. **Resend** (Transactional Email) - 5 min
**���� [resend.com](https://resend.com)** → **API Keys** → **Create API Key**
- Name: `qb-invoice-auto`
- Copy key → `RESEND_API_KEY`
- **Domains**: Add your domain OR use `onboarding@resend.dev` for testing
- Set `EMAIL_FROM=onboarding@resend.dev` (or your verified domain)

---

### 7. **Cloudflare** (Email Worker) - 15 min
**���� [dash.cloudflare.com](https://dash.cloudflare.com)** → Add your domain (if not already)
- **Email → Email Routing** → Enable
- **Email → Email Workers** → **Create Worker**
  - Name: `qb-invoice-auto-email`
  - Paste `cloudflare-email-worker.js` content
  - **Settings → Variables** (add):
    - `API_URL` = `https://your-app.vercel.app/api/ingest`
    - `EMAIL_WORKER_SECRET` = generate random: `openssl rand -hex 32`
- **Email → Routing Rules** → **Create Custom Address**:
  - Address: `invoices@yourdomain.com`
  - Action: **Send to Worker** → Select your worker
- Save the `EMAIL_WORKER_SECRET` for your `.env.local`

---

### 8. **Vercel** (Deploy) - 5 min
**���� [vercel.com](https://vercel.com)** → **Import Git Repository** (push to GitHub first)
- Connect GitHub → Select `qb-invoice-auto`
- **Environment Variables** (add ALL from below)
- **Deploy**

---

## ��� Your `.env.local` Template

Copy this to `D:\Goose Projects\Nemotron 3 Ultra\qb-invoice-auto\.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# QuickBooks (Intuit)
QB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
QB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
QB_REDIRECT_URI=http://localhost:3000/api/auth/callback/qb
QB_ENVIRONMENT=sandbox
QB_BASE_URL=https://sandbox-quickbooks.api.intuit.com

# Groq (Free AI)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ID_BOOKKEEPER=price_xxxxxxxxxxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=QB Invoice Auto

# Encryption (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Cloudflare Email Worker
EMAIL_WORKER_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## �� Quick Test Checklist

After deploying to Vercel:

| Test | How |
|------|-----|
| **Landing page** | Visit `https://your-app.vercel.app` |
| **Sign up** | Click "Start Free" → Clerk signup flow |
| **Connect QB** | Dashboard → "Connect QuickBooks" → Authorize sandbox |
| **Send test email** | Forward invoice PDF to `invoices@yourdomain.com` |
| **Check dashboard** | Invoice should appear with parsed data |
| **Sync to QB** | Click "Push to QuickBooks" → Verify in QB Sandbox |
| **Upgrade** | Click "Upgrade to Pro" → Stripe Checkout → Success |

---

## ��� Need Help?

**Common Issues:**
- **Clerk webhook fails**: Use `ngrok` for local: `ngrok http 3000` → update webhook URL
- **QB OAuth fails**: Check redirect URI matches EXACTLY (including trailing slash)
- **Email worker 401**: Verify `EMAIL_WORKER_SECRET` matches in both Cloudflare and `.env`
- **PDF not parsing**: Check Cloudflare worker logs for attachment extraction errors

**Support Links:**
- Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- Clerk Discord: [clerk.com/discord](https://clerk.com/discord)
- Intuit Developer Forum: [developer.intuit.com](https://developer.intuit.com)
- Stripe Discord: [stripe.com/discord](https://stripe.com/discord)
- Groq Discord: [groq.com/discord](https://groq.com/discord)

---

## ��� Start Here

**Open these 3 tabs first (most critical):**
1. **���� [supabase.com](https://supabase.com)** - Create project & run SQL
2. **���� [clerk.com](https://clerk.com)** - Create app & get keys
3. **���� [developer.intuit.com](https://developer.intuit.com)** - Create QB app

**Then come back and tell me which ones are done, and I'll help with the next batch!**