'use client';

import { useState } from 'react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { FileText, Eye, RefreshCw, AlertCircle, CheckCircle, XCircle, Loader2, ChevronDown, Upload, Settings, Plus } from 'lucide-react';

interface Invoice {
  id: string;
  vendor_name: string | null;
  vendor_email: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  currency: string;
  qb_sync_status: 'pending' | 'synced' | 'failed' | 'skipped';
  qb_sync_error: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'edited';
  confidence_score: number | null;
  created_at: string;
  line_items: any[];
  raw_email_text: string | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'pro' | 'bookkeeper';
  invoices_limit: number;
  invoices_used_this_month: number;
}

interface Props {
  user: User;
  invoices: Invoice[];
  stats: {
    total: number;
    pending: number;
    synced: number;
    failed: number;
    thisMonth: number;
  };
  qbConnected: boolean;
}

export function DashboardClient({ user, invoices, stats, qbConnected }: Props) {
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus === 'all') return true;
    return inv.qb_sync_status === filterStatus;
  });

  const handleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedInvoices(prev => prev.includes(id) 
      ? prev.filter(i => i !== id) 
      : [...prev, id]
    );
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch('/api/invoices/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      toast({ title: 'Synced!', description: 'Invoice pushed to QuickBooks', variant: 'success' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleBulkSync = async () => {
    for (const id of selectedInvoices) {
      setSyncingId(id);
      try {
        await fetch('/api/invoices/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: id }),
        });
      } catch (e) {
        console.error('Bulk sync error:', e);
      }
    }
    setSelectedInvoices([]);
    toast({ title: 'Bulk sync complete', description: `${selectedInvoices.length} invoices processed`, variant: 'success' });
    window.location.reload();
  };

  const handleUpgrade = async (plan: 'pro' | 'bookkeeper') => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to start checkout', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced': return <Badge variant="success">Synced</Badge>;
      case 'pending': return <Badge variant="warning">Pending Review</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'skipped': return <Badge variant="secondary">Skipped</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReviewBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="success">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      case 'edited': return <Badge variant="warning">Edited</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const planLimits = {
    free: { limit: 5, price: 0 },
    pro: { limit: -1, price: 12 },
    bookkeeper: { limit: -1, price: 29 },
  };

  const currentPlan = planLimits[user.plan];
  const usagePercent = currentPlan.limit === -1 ? 0 : (user.invoices_used_this_month / currentPlan.limit) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900">QB Invoice Auto</h1>
              <nav className="hidden md:flex items-center gap-6">
                <a href="/dashboard" className="text-gray-700 font-medium">Dashboard</a>
                <a href="/pricing" className="text-gray-500 hover:text-gray-700">Pricing</a>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {user.plan === 'free' && (
                <Button variant="outline" size="sm" onClick={() => handleUpgrade('pro')}>
                  Upgrade to Pro ($12/mo)
                </Button>
              )}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user.name || user.email}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleUpgrade('pro')}>Upgrade to Pro</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpgrade('bookkeeper')}>Upgrade to Bookkeeper</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = '/api/stripe/portal'}>Manage Billing</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => window.location.href = '/api/auth/sign-out'}>Sign Out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* QB Connection Banner */}
        {!qbConnected && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">QuickBooks not connected</p>
                  <p className="text-sm text-yellow-700">Connect to sync invoices automatically</p>
                </div>
              </div>
              <Button onClick={() => window.location.href = '/api/auth/qb'}>Connect QuickBooks</Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard title="This Month" value={stats.thisMonth} limit={currentPlan.limit} plan={user.plan} />
          <StatCard title="Pending Review" value={stats.pending} icon={<AlertCircle className="h-5 w-5 text-yellow-500" />} />
          <StatCard title="Synced to QB" value={stats.synced} icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
          <StatCard title="Failed" value={stats.failed} icon={<XCircle className="h-5 w-5 text-red-500" />} />
          <StatCard title="Total Processed" value={stats.total} icon={<FileText className="h-5 w-5 text-blue-500" />} />
        </div>

        {/* Usage Bar (Free plan) */}
        {user.plan === 'free' && (
          <div className="mb-6 p-4 bg-white border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Monthly Usage</span>
              <span className="text-sm text-gray-500">{user.invoices_used_this_month} / {currentPlan.limit} invoices</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500 transition-all" 
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Upgrade to Pro for unlimited invoices</p>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Invoices</h2>
            <div className="flex items-center gap-2">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="synced">Synced</option>
                <option value="failed">Failed</option>
              </select>
              {selectedInvoices.length > 0 && (
                <Button size="sm" onClick={handleBulkSync} disabled={syncingId !== null}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Sync Selected ({selectedInvoices.length})
                </Button>
              )}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices yet</h3>
              <p className="text-gray-500 mb-4">Forward invoice emails to <code className="bg-gray-100 px-2 py-1 rounded">invoices@yourdomain.com</code> to get started</p>
              <Button onClick={() => window.location.href = '/settings'}>Configure Email Forwarding</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>QB Status</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelect(invoice.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{invoice.vendor_name || 'Unknown Vendor'}</TableCell>
                    <TableCell>{invoice.invoice_number || '—'}</TableCell>
                    <TableCell>{invoice.invoice_date ? formatDate(invoice.invoice_date) : '—'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {invoice.total_amount ? formatCurrency(invoice.total_amount, invoice.currency) : '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.qb_sync_status)}</TableCell>
                    <TableCell>{getReviewBadge(invoice.review_status)}</TableCell>
                    <TableCell>
                      {invoice.confidence_score !== null && (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all" 
                              style={{ width: `${invoice.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{Math.round(invoice.confidence_score * 100)}%</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewInvoice(invoice)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {invoice.qb_sync_status !== 'synced' && invoice.review_status !== 'rejected' && (
                            <DropdownMenuItem 
                              onClick={() => handleSync(invoice.id)} 
                              disabled={syncingId === invoice.id}
                            >
                              {syncingId === invoice.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Push to QuickBooks
                            </DropdownMenuItem>
                          )}
                          {invoice.qb_sync_status === 'failed' && (
                            <DropdownMenuItem className="text-red-600">
                              <AlertCircle className="h-4 w-4 mr-2" /> Error: {invoice.qb_sync_error?.slice(0, 50)}...
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setViewInvoice(invoice)}>
                            Edit Data
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* Invoice Detail Dialog */}
      {viewInvoice && (
        <InvoiceDetailDialog 
          invoice={viewInvoice} 
          onClose={() => setViewInvoice(null)} 
          onSync={handleSync}
          syncing={syncingId === viewInvoice.id}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, limit, plan, icon }: { 
  title: string; 
  value: number; 
  limit?: number; 
  plan?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {limit === -1 ? '∞' : limit !== undefined ? `${value} / ${limit}` : value}
          </p>
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      {plan === 'free' && limit && limit !== -1 && (
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500" 
            style={{ width: `${Math.min((value / limit) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface InvoiceDetailDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onSync: (id: string) => void;
  syncing: boolean;
}

function InvoiceDetailDialog({ invoice, onClose, onSync, syncing }: InvoiceDetailDialogProps) {
  const [edited, setEdited] = useState<Partial<Invoice>>({});

  const handleSave = async () => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, ...edited }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast({ title: 'Saved', description: 'Invoice updated', variant: 'success' });
      onClose();
      window.location.reload();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription>Review and edit before pushing to QuickBooks</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 md:grid-cols-2 py-4">
          <div>
            <Label>Vendor Name</Label>
            <Input 
              value={edited.vendor_name || invoice.vendor_name || ''} 
              onChange={(e) => setEdited({...edited, vendor_name: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Vendor Email</Label>
            <Input 
              type="email"
              value={edited.vendor_email || invoice.vendor_email || ''} 
              onChange={(e) => setEdited({...edited, vendor_email: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Invoice Number</Label>
            <Input 
              value={edited.invoice_number || invoice.invoice_number || ''} 
              onChange={(e) => setEdited({...edited, invoice_number: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Invoice Date</Label>
            <Input 
              type="date"
              value={edited.invoice_date || invoice.invoice_date || ''} 
              onChange={(e) => setEdited({...edited, invoice_date: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input 
              type="date"
              value={edited.due_date || invoice.due_date || ''} 
              onChange={(e) => setEdited({...edited, due_date: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Total Amount</Label>
            <Input 
              type="number"
              step="0.01"
              value={edited.total_amount != null ? edited.total_amount : (invoice.total_amount != null ? invoice.total_amount : '')} 
              onChange={(e) => setEdited({...edited, total_amount: parseFloat(e.target.value)})}
              className="mt-1"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Line Items</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoice.line_items || []).map((item: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price, invoice.currency)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.amount, invoice.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Source Email Preview */}
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Source Email (truncated)</h3>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-40 overflow-y-auto">
            {invoice.raw_email_text?.slice(0, 2000) || 'No raw email stored'}
          </pre>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={handleSave} disabled={Object.keys(edited).length === 0}>
            Save Changes
          </Button>
          {invoice.qb_sync_status !== 'synced' && (
            <Button onClick={() => onSync(invoice.id)} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} Push to QuickBooks
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}