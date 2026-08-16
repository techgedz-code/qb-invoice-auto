import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function generateInvoiceNumber(): string {
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

export function calculateMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isLimitExceeded(used: number, limit: number): boolean {
  if (limit === -1) return false; // Unlimited
  return used >= limit;
}

export function getPlanFromPriceId(priceId: string): 'free' | 'pro' | 'bookkeeper' {
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_ID_BOOKKEEPER) return 'bookkeeper';
  return 'free';
}