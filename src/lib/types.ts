export interface ParsedInvoice {
  vendorName: string;
  vendorEmail?: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO date
  dueDate?: string; // ISO date
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  lineItems: LineItem[];
  confidenceScore: number; // 0-1
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sku?: string;
}

export interface InvoiceRecord {
  id: string;
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
  currency: string;
  line_items: LineItem[];
  qb_invoice_id?: string;
  qb_sync_status: 'pending' | 'synced' | 'failed' | 'skipped';
  qb_sync_error?: string;
  qb_synced_at?: string;
  review_status: 'pending' | 'approved' | 'rejected' | 'edited';
  reviewed_at?: string;
  source_email?: string;
  parsed_by_ai: boolean;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface UserRecord {
  id: string;
  clerk_user_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  plan: 'free' | 'pro' | 'bookkeeper';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  invoices_used_this_month: number;
  invoices_limit: number;
  created_at: string;
  updated_at: string;
}

export interface QBTokensRecord {
  id: string;
  user_id: string;
  realm_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type PlanType = 'free' | 'pro' | 'bookkeeper';

export const PLAN_LIMITS: Record<PlanType, { invoicesLimit: number; price: number; name: string }> = {
  free: { invoicesLimit: 5, price: 0, name: 'Free' },
  pro: { invoicesLimit: -1, price: 12, name: 'Pro' },
  bookkeeper: { invoicesLimit: -1, price: 29, name: 'Bookkeeper' },
};