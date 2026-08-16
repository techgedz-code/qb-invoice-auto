import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Mail, Zap, Shield, Check, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Mail,
    title: 'Forward & Forget',
    description: 'Just forward invoice emails to your unique address. No uploading, no scanning, no manual entry.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Extraction',
    description: 'Llama 3.1 parses vendor, amounts, line items, dates — even from messy PDFs — with 95%+ accuracy.',
  },
  {
    icon: FileText,
    title: 'One-Click QuickBooks Sync',
    description: 'Review parsed data side-by-side with the PDF, then push to QuickBooks Online instantly.',
  },
  {
    icon: Shield,
    title: 'Built for Bookkeepers',
    description: 'Multi-client dashboard, audit logs, and bulk operations — designed for accounting workflows.',
  },
];

const stats = [
  { value: '10h', label: 'Saved per month' },
  { value: '95%+', label: 'Extraction accuracy' },
  { value: '$12', label: 'Starting price / mo' },
  { value: '5 min', label: 'Setup time' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-gray-900">QB Invoice Auto</span>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
                <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
                <Link href="#faq" className="text-gray-600 hover:text-gray-900">FAQ</Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Start Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              New: Email-to-QuickBooks automation — no scanning required
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Forward invoice emails.<br />
              <span className="text-blue-600">Get structured data in QuickBooks.</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Stop manually typing invoices into QuickBooks. Forward any invoice email — PDF attached or not — 
              and our AI extracts vendor, line items, amounts, and dates. Review once, sync instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Start Free — 5 invoices/mo
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  See How It Works
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
              <span>No credit card required</span>
              <span>•</span>
              <span>Cancel anytime</span>
              <span>•</span>
              <span>SOC 2 compliant</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Built for the way you actually work
            </h2>
            <p className="text-lg text-gray-600">
              No workflow changes. No new software to learn. Just forward and done.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="demo" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Three steps to done</h2>
            <p className="text-lg text-gray-600">Set up once, save hours every month</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard 
              number="01" 
              title="Connect & Configure" 
              description="Link QuickBooks in one click. Get your unique forwarding address (invoices@yourdomain.com)."
              icon={<Mail className="h-8 w-8" />}
            />
            <StepCard 
              number="02" 
              title="Forward Invoices" 
              description="Email or auto-forward invoices to your address. PDFs, images, plain text — all supported."
              icon={<FileText className="h-8 w-8" />}
            />
            <StepCard 
              number="03" 
              title="Review & Sync" 
              description="See parsed data next to the original. Click once to push to QuickBooks. Done."
              icon={<Zap className="h-8 w-8" />}
            />
          </div>
        </div>
      </section>

      {/* Social Proof / Bookkeeper Section */}
      <section className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for bookkeepers, too</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Manage multiple clients from one dashboard. Bulk review, audit trails, and client portals — 
              all included in the Bookkeeper plan.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <FeatureBullet icon={Check} text="Multi-client dashboard with usage tracking" />
              <FeatureBullet icon={Check} text="White-label client portal (coming soon)" />
              <FeatureBullet icon={Check} text="Bulk sync & export for month-end close" />
              <FeatureBullet icon={Check} text="Audit logs for every sync action" />
              <FeatureBullet icon={Check} text="Priority email support" />
              <FeatureBullet icon={Check} text="API access for custom workflows" />
            </div>
            <Link href="/pricing" className="mt-8 inline-block">
              <Button size="lg">View Bookkeeper Plan →</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently asked questions</h2>
          <dl className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="border rounded-lg p-6">
                <dt className="font-semibold text-gray-900 mb-2">{faq.q}</dt>
                <dd className="text-gray-600">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to stop manual entry?</h2>
          <p className="text-gray-300 mb-8">Join 100+ bookkeepers and founders saving 10+ hours/month</p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              Start Free — 5 invoices/month forever
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-bold text-gray-900">QB Invoice Auto</span>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-900">Terms</Link>
              <Link href="https://twitter.com/qbinvoiceauto" className="hover:text-gray-900" target="_blank">Twitter</Link>
              <Link href="https://github.com/qb-invoice-auto" className="hover:text-gray-900" target="_blank">GitHub</Link>
            </div>
            <p className="text-sm text-gray-500">Not affiliated with Intuit or QuickBooks</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ number, title, description, icon }: { number: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="relative p-6 bg-white border rounded-xl">
      <div className="absolute -top-3 left-6 bg-white px-2 text-sm font-bold text-blue-600">{number}</div>
      <div className="mb-4 text-blue-600">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function FeatureBullet({ icon, text }: { icon: React.ElementType; text: string }) {
  const Icon = icon;
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5"><Icon className="h-5 w-5" /></div>
      <span className="text-gray-700">{text}</span>
    </div>
  );
}

const faqs = [
  {
    q: 'What email formats are supported?',
    a: 'PDF attachments, image attachments (JPG, PNG), plain text emails, and HTML emails. The AI extracts data from all of them.'
  },
  {
    q: 'How accurate is the AI extraction?',
    a: 'Typically 95%+ for standard invoices. You always review before syncing, and can edit any field. Confidence scores help you spot low-confidence extractions.'
  },
  {
    q: 'Do you store my invoice data?',
    a: 'Yes, encrypted in our database (Supabase) for your review history and audit logs. We never use your data for training. You can delete anytime.'
  },
  {
    q: 'Which QuickBooks versions are supported?',
    a: 'QuickBooks Online (all regions: US, CA, UK, AU, IN, FR, etc.). QuickBooks Desktop is not supported.'
  },
  {
    q: 'Can I use this for multiple companies?',
    a: 'Yes! The Bookkeeper plan supports unlimited clients/companies. Each client gets their own QB connection and forwarding address.'
  },
  {
    q: 'What happens if I exceed my monthly limit?',
    a: 'Free plan: new invoices queue until next month or upgrade. Pro/Bookkeeper: unlimited invoices, no limits.'
  },
];