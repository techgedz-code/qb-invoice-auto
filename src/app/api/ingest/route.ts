import { NextRequest, NextResponse } from 'next/server';
import { turso, createOrUpdateUser, incrementInvoiceUsage, createInvoice, createAuditLog } from '@/lib/turso';
import { parsePDFFromBase64 } from '@/lib/pdf-parser';
import { extractInvoiceData, getCurrentModel } from '@/lib/extraction-provider';

const EMAIL_WORKER_SECRET = process.env.EMAIL_WORKER_SECRET;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (EMAIL_WORKER_SECRET && authHeader !== `Bearer ${EMAIL_WORKER_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userEmail, fromEmail, subject, textBody, htmlBody, attachments } = body;

    if (!userEmail || !fromEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find user by email
    const user = await turso.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [userEmail],
    });

    if (!user.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = user.rows[0];

    // Check monthly limit
    const used = userData.invoices_used_this_month as number;
    const limit = userData.invoices_limit as number;
    if (limit !== -1 && used >= limit) {
      return NextResponse.json({ error: 'Monthly limit reached' }, { status: 429 });
    }

    // Extract text from PDF attachment
    let extractedText = textBody || htmlBody || '';
    let pdfBase64: string | undefined;

    if (attachments && attachments.length > 0) {
      const pdfAttachment = attachments.find((a: any) => 
        a.contentType === 'application/pdf' || a.filename?.endsWith('.pdf')
      );
      
      if (pdfAttachment?.content) {
        pdfBase64 = pdfAttachment.content as string;
        try {
          const pdfText = await parsePDFFromBase64(pdfBase64);
          extractedText = pdfText + '\n\n' + extractedText;
        } catch (e) {
          console.error('PDF parse failed:', e);
        }
      }
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'No text content to parse' }, { status: 400 });
    }

    // Extract invoice data using AI (OpenRouter with model switching)
    const model = getCurrentModel();
    const parsed = await extractInvoiceData(extractedText, model);

    // Save to database
    const invoice = await createInvoice({
      user_id: userData.id as string,
      raw_email_text: extractedText.slice(0, 10000),
      raw_pdf_base64: pdfBase64,
      vendor_name: parsed.vendorName,
      vendor_email: parsed.vendorEmail,
      invoice_number: parsed.invoiceNumber,
      invoice_date: parsed.invoiceDate,
      due_date: parsed.dueDate,
      subtotal: parsed.subtotal,
      tax_amount: parsed.taxAmount,
      total_amount: parsed.totalAmount,
      currency: parsed.currency,
      line_items: parsed.lineItems,
      source_email: fromEmail,
      parsed_by_ai: true,
      confidence_score: parsed.confidenceScore,
    });

    // Increment user's monthly usage
    await incrementInvoiceUsage(userData.id as string);

    // Log audit
    await createAuditLog({
      user_id: userData.id as string,
      action: 'invoice_created',
      resource_type: 'invoice',
      resource_id: invoice?.id as string,
      metadata: { source: 'email', vendor: parsed.vendorName, model },
    });

    return NextResponse.json({ 
      success: true, 
      invoiceId: invoice?.id,
      parsed: {
        vendorName: parsed.vendorName,
        totalAmount: parsed.totalAmount,
        confidenceScore: parsed.confidenceScore,
        model,
      }
    });

  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}