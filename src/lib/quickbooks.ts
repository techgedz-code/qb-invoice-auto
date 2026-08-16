import { decrypt, encrypt } from './encryption';
import { turso } from './turso';
import { QBTokensRecord } from './types';

const QB_BASE_URL = process.env.QB_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com';
const QB_CLIENT_ID = process.env.QB_CLIENT_ID!;
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET!;

export interface QBInvoice {
  Line: QBInvoiceLine[];
  CustomerRef: { value: string };
  TxnDate: string;
  DueDate?: string;
  PrivateNote?: string;
  DocNumber?: string;
}

export interface QBInvoiceLine {
  DetailType: 'SalesItemLineDetail';
  Amount: number;
  Description?: string;
  SalesItemLineDetail: {
    ItemRef: { value: string; name?: string };
    Qty: number;
    UnitPrice: number;
    TaxCodeRef?: { value: string };
  };
}

export interface QBVendor {
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
}

export interface QBItem {
  Name: string;
  Type: 'Service' | 'NonInventory' | 'Inventory';
  UnitPrice?: number;
  PurchaseDesc?: string;
  PurchaseCost?: number;
  ExpenseAccountRef?: { value: string };
  IncomeAccountRef?: { value: string };
}

async function getValidAccessToken(userId: string, realmId: string): Promise<string> {
  const result = await turso.execute({
    sql: 'SELECT * FROM qb_tokens WHERE user_id = ? AND realm_id = ?',
    args: [userId, realmId],
  });

  const tokens = result.rows[0];
  if (!tokens) {
    throw new Error('QuickBooks not connected');
  }

  const tokenData = tokens as unknown as QBTokensRecord;
  
  // Check if token expires in next 5 minutes
  const expiresAt = new Date(tokenData.expires_at).getTime();
  const now = Date.now();
  
  if (expiresAt - now < 5 * 60 * 1000) {
    return await refreshAccessToken(userId, realmId, tokenData);
  }

  return decrypt(tokenData.access_token_encrypted);
}

async function refreshAccessToken(userId: string, realmId: string, tokenData: QBTokensRecord): Promise<string> {
  const refreshToken = decrypt(tokenData.refresh_token_encrypted);
  
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh QuickBooks token');
  }

  const data = await response.json();
  
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  
  await turso.execute({
    sql: `UPDATE qb_tokens SET access_token_encrypted = ?, refresh_token_encrypted = ?, expires_at = ?, updated_at = ? WHERE user_id = ? AND realm_id = ?`,
    args: [
      encrypt(data.access_token),
      encrypt(data.refresh_token),
      newExpiresAt.toISOString(),
      new Date().toISOString(),
      userId,
      realmId,
    ],
  });

  return data.access_token;
}

export async function qbRequest<T>(
  userId: string,
  realmId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(userId, realmId);
  
  const response = await fetch(`${QB_BASE_URL}/v3/company/${realmId}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QB API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function findOrCreateVendor(
  userId: string,
  realmId: string,
  vendorName: string,
  vendorEmail?: string
): Promise<string> {
  // Search for existing vendor
  const query = `SELECT * FROM Vendor WHERE DisplayName = '${vendorName.replace(/'/g, "''")}'`;
  const result = await qbRequest<{ QueryResponse?: { Vendor?: any[] } }>(
    userId,
    realmId,
    `/query?query=${encodeURIComponent(query)}`
  );

  if (result.QueryResponse?.Vendor?.[0]) {
    return result.QueryResponse.Vendor[0].Id;
  }

  // Create new vendor
  const vendor: QBVendor = {
    DisplayName: vendorName,
    ...(vendorEmail && { PrimaryEmailAddr: { Address: vendorEmail } }),
  };

  const createResult = await qbRequest<{ Vendor: { Id: string } }>(
    userId,
    realmId,
    '/vendor',
    { method: 'POST', body: JSON.stringify(vendor) }
  );

  return createResult.Vendor.Id;
}

export async function findOrCreateItem(
  userId: string,
  realmId: string,
  itemName: string,
  unitPrice: number
): Promise<string> {
  const query = `SELECT * FROM Item WHERE Name = '${itemName.replace(/'/g, "''")}' AND Type = 'Service'`;
  const result = await qbRequest<{ QueryResponse?: { Item?: any[] } }>(
    userId,
    realmId,
    `/query?query=${encodeURIComponent(query)}`
  );

  if (result.QueryResponse?.Item?.[0]) {
    return result.QueryResponse.Item[0].Id;
  }

  const item: QBItem = {
    Name: itemName,
    Type: 'Service',
    UnitPrice: unitPrice,
    IncomeAccountRef: { value: '79' }, // Default Sales of Product Income - user should configure
  };

  const createResult = await qbRequest<{ Item: { Id: string } }>(
    userId,
    realmId,
    '/item',
    { method: 'POST', body: JSON.stringify(item) }
  );

  return createResult.Item.Id;
}

export async function createInvoice(
  userId: string,
  realmId: string,
  invoice: QBInvoice
): Promise<string> {
  const result = await qbRequest<{ Invoice: { Id: string } }>(
    userId,
    realmId,
    '/invoice',
    { method: 'POST', body: JSON.stringify(invoice) }
  );

  return result.Invoice.Id;
}

export async function getCompanyInfo(userId: string, realmId: string) {
  return qbRequest(userId, realmId, `/companyinfo/${realmId}`);
}