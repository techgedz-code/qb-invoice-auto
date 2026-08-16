import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: 0,
    period: '/mo',
    description: 'Perfect for trying it out',
    features: [
      '5 invoices/month',
      'AI extraction (Llama 3.1)',
      'QuickBooks Online sync',
      'Email forwarding address',
      'Review dashboard',
      'Audit logs (30 days)',
      'Email support',
    ],
    notIncluded: [
      'Unlimited invoices',
      'Multi-client management',
      'Bulk operations',
      'API access',
      'Priority support',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: 12,
    period: '/mo',
    description: 'For solo founders & small businesses',
    features: [
      'Unlimited invoices',
      'AI extraction (Llama 3.1)',
      'QuickBooks Online sync',
      'Custom forwarding address',
      'Review dashboard',
      'Audit logs (1 year)',
      'Priority email support',
      'Zapier/Make webhooks',
    ],
    notIncluded: [
      'Multi-client dashboard',
      'Client portal',
      'Team seats',
      'API access',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Bookkeeper',
    price: 29,
    period: '/mo',
    description: 'For accounting professionals',
    features: [
      'Everything in Pro',
      'Up to 10 clients included',
      'Multi-client dashboard',
      'Client portal (beta)',
      'Bulk sync & export',
      'Team seats (up to 3)',
      'API access',
      'White-label options',
      'Dedicated Slack support',
      'Custom onboarding',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false,
    custom: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">QB Invoice Auto</Link>
            <div className="flex items-center gap-3">
              <Link href="/sign-in"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link href="/sign-up"><Button size="sm">Get Started</Button></Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-20 lg:py-32 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            No hidden fees. No per-invoice charges after your plan limit. 
            Cancel anytime. 14-day money-back guarantee on paid plans.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100">
            <span className="text-sm font-medium text-gray-700">Billed monthly</span>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, i) => (
              <PlanCard key={i} plan={plan} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Feature comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Feature</th>
                  {plans.map((plan, i) => (
                    <th key={i} className="py-3 px-4 font-semibold text-center text-gray-900">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-4 px-4 font-medium text-gray-900">{row.feature}</td>
                    {plans.map((plan, j) => (
                      <td key={j} className="py-4 px-4 text-center">
                        {row.check(plan) ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Still have questions?</h2>
          <dl className="space-y-6">
            {pricingFAQs.map((faq, i) => (
              <div key={i} className="border rounded-lg p-6">
                <dt className="font-semibold text-gray-900 mb-2">{faq.q}</dt>
                <dd className="text-gray-600">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to automate your invoice entry?</h2>
          <p className="text-gray-300 mb-8">Start free. Upgrade when you need more.</p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function PlanCard({ plan, index }: { plan: typeof plans[0]; index: number }) {
  return (
    <div className={`relative rounded-2xl border p-6 md:p-8 ${plan.popular ? 'border-blue-500 shadow-lg' : 'border-gray-200'}`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full">
          Most Popular
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        <p className="text-gray-600 mt-1">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
        <span className="text-gray-500">{plan.period}</span>
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
        {plan.notIncluded.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-gray-400">
            <X className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span className="line-through">{feature}</span>
          </li>
        ))}
      </ul>

      <Link href={plan.custom ? '/contact' : '/sign-up'}>
        <Button 
          className="w-full" 
          variant={plan.popular ? 'default' : 'outline'}
          size="lg"
        >
          {plan.cta}
        </Button>
      </Link>

      {plan.custom && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Or <a href="mailto:hello@qbinvoiceauto.com" className="text-blue-600 hover:underline">email us</a> for custom pricing
        </p>
      )}
    </div>
  );
}

const comparisonRows = [
  { feature: 'Monthly invoices', check: (p: any) => p.name !== 'Free' || true, freeLimit: 5 },
  { feature: 'AI extraction', check: () => true },
  { feature: 'QuickBooks Online sync', check: () => true },
  { feature: 'Email forwarding address', check: () => true },
  { feature: 'Review dashboard', check: () => true },
  { feature: 'Audit logs', check: (p: any) => p.name !== 'Free' || false, freeDays: 30 },
  { feature: 'Email support', check: () => true },
  { feature: 'Priority support', check: (p: any) => p.name !== 'Free' },
  { feature: 'Webhooks (Zapier/Make)', check: (p: any) => p.name === 'Pro' || p.name === 'Bookkeeper' },
  { feature: 'Multi-client dashboard', check: (p: any) => p.name === 'Bookkeeper' },
  { feature: 'Client portal', check: (p: any) => p.name === 'Bookkeeper' },
  { feature: 'Bulk operations', check: (p: any) => p.name === 'Bookkeeper' },
  { feature: 'Team seats', check: (p: any) => p.name === 'Bookkeeper' },
  { feature: 'API access', check: (p: any) => p.name === 'Bookkeeper' },
  { feature: 'White-label options', check: (p: any) => p.name === 'Bookkeeper' },
].map(row => ({
  ...row,
  check: row.check || (() => false),
}));

const pricingFAQs = [
  {
    q: 'Can I change plans later?',
    a: 'Yes, upgrade or downgrade anytime. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your billing cycle.'
  },
  {
    q: 'What happens when I hit the Free plan limit?',
    a: 'New invoices will queue in "pending" status. They won\'t be processed until your limit resets (1st of next month) or you upgrade. You\'ll get an email notification.'
  },
  {
    q: 'Is there a long-term contract?',
    a: 'No. All plans are month-to-month. Cancel anytime from your dashboard. You\'ll keep access until the end of your billing period.'
  },
  {
    q: 'Do you offer annual billing discounts?',
    a: 'Not yet. We\'re keeping it simple with monthly billing for now. Annual plans with 20% off are on the roadmap for Q1 2026.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit/debit cards via Stripe. We also accept ACH for Bookkeeper plan annual contracts (contact sales).'
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Data encrypted at rest (AES-256) and in transit (TLS 1.2+). SOC 2 Type II compliant infrastructure (Supabase, Vercel). We never use your invoices for AI training.'
  },
];