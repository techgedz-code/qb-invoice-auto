/**
 * Cloudflare Email Worker for QB Invoice Auto
 * 
 * This worker receives forwarded emails and sends them to your Next.js API
 * 
 * DEPLOYMENT:
 * 1. Go to Cloudflare Dashboard > Email > Email Workers
 * 2. Create a new worker
 * 3. Paste this code
 * 4. Add your domain and create routing rules
 * 5. Set environment variables in Cloudflare dashboard
 * 
 * EMAIL ROUTING SETUP:
 * - Add your domain to Cloudflare Email Routing
 * - Create custom address: invoices@yourdomain.com
 * - Route to this worker
 * - Or use catch-all: *@yourdomain.com -> this worker
 */

export default {
  async email(message, env, ctx) {
    try {
      // Extract email data
      const emailData = await extractEmailData(message);
      
      // Forward to your API
      await forwardToApi(emailData, env);
      
      // Don't bounce - we've processed it
      message.setReject('Processed by QB Invoice Auto');
    } catch (error) {
      console.error('Email worker error:', error);
      // Reject so sender knows it failed
      message.setReject(`Processing failed: ${error.message}`);
    }
  },
};

async function extractEmailData(message) {
  const raw = new Response(message.raw, {
    headers: { 'Content-Type': 'message/rfc822' },
  });
  
  const blob = await raw.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const rawEmail = new TextDecoder().decode(arrayBuffer);
  
  // Parse email (simplified - in production use a proper MIME parser)
  const parsed = parseEmail(rawEmail);
  
  return {
    fromEmail: parsed.from,
    toEmail: parsed.to,
    subject: parsed.subject,
    textBody: parsed.textBody,
    htmlBody: parsed.htmlBody,
    attachments: parsed.attachments,
    receivedAt: new Date().toISOString(),
  };
}

function parseEmail(rawEmail) {
  // Simple email parsing - for production, consider using a library like
  // 'mailparser' but that would require bundling. This works for basic cases.
  
  const lines = rawEmail.split('\r\n');
  let headers = {};
  let bodyStart = 0;
  
  // Parse headers
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '') {
      bodyStart = i + 1;
      break;
    }
    const colonIndex = lines[i].indexOf(':');
    if (colonIndex > 0) {
      const key = lines[i].slice(0, colonIndex).toLowerCase().trim();
      const value = lines[i].slice(colonIndex + 1).trim();
      headers[key] = value;
    }
  }
  
  const body = lines.slice(bodyStart).join('\r\n');
  
  // Extract attachments (simplified - looks for base64 content)
  const attachments = extractAttachments(rawEmail);
  
  return {
    from: headers['from'] || '',
    to: headers['to'] || '',
    subject: headers['subject'] || '',
    textBody: extractTextBody(body),
    htmlBody: extractHtmlBody(body),
    attachments,
  };
}

function extractTextBody(body) {
  // Look for text/plain part
  const textMatch = body.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type:|$)/i);
  if (textMatch) return decodeQuotedPrintable(textMatch[1]);
  
  // Fallback: strip HTML tags
  return body.replace(/<[^>]*>/g, '').replace(/\r\n/g, '\n').trim();
}

function extractHtmlBody(body) {
  const htmlMatch = body.match(/Content-Type: text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type:|$)/i);
  if (htmlMatch) return decodeQuotedPrintable(htmlMatch[1]);
  return null;
}

function extractAttachments(rawEmail) {
  const attachments = [];
  
  // Find all base64 encoded attachments
  const boundaryMatch = rawEmail.match(/boundary="?([^"\r\n]+)"?/i);
  if (!boundaryMatch) return attachments;
  
  const boundary = boundaryMatch[1];
  const parts = rawEmail.split(`--${boundary}`);
  
  for (const part of parts) {
    const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n;]+)/i);
    const dispositionMatch = part.match(/Content-Disposition:\s*attachment[^;]*;\s*filename="?([^"\r\n]+)"?/i);
    const encodingMatch = part.match(/Content-Transfer-Encoding:\s*(\w+)/i);
    const contentIdMatch = part.match(/Content-ID:\s*<([^>]+)>/i);
    
    if (contentTypeMatch && dispositionMatch) {
      const contentType = contentTypeMatch[1].trim();
      const filename = dispositionMatch[1];
      const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : 'base64';
      
      // Extract the base64 content (after double CRLF)
      const contentStart = part.indexOf('\r\n\r\n');
      if (contentStart >= 0) {
        let content = part.slice(contentStart + 4).trim();
        content = content.replace(new RegExp(`\r\n--${boundary}.*$`), '').trim();
        
        if (encoding === 'base64') {
          attachments.push({
            filename,
            contentType,
            content, // base64 string
            contentId: contentIdMatch ? contentIdMatch[1] : null,
          });
        }
      }
    }
  }
  
  return attachments;
}

function decodeQuotedPrintable(text) {
  return text
    .replace(/=\r\n/g, '') // Soft line breaks
    .replace(/=([0-9A-F]{2})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/_/g, ' '); // Q-encoding spaces
}

async function forwardToApi(emailData, env) {
  const apiUrl = env.API_URL || 'https://your-app.vercel.app/api/ingest';
  const secret = env.EMAIL_WORKER_SECRET;
  
  // Determine user from recipient email
  // Format: invoices+userId@yourdomain.com or similar
  const userEmail = extractUserEmail(emailData.toEmail);
  
  if (!userEmail) {
    throw new Error('Cannot determine user from recipient email');
  }
  
  const payload = {
    userEmail,
    fromEmail: emailData.fromEmail,
    subject: emailData.subject,
    textBody: emailData.textBody,
    htmlBody: emailData.htmlBody,
    attachments: emailData.attachments.map(a => ({
      filename: a.filename,
      contentType: a.contentType,
      content: a.content,
      contentId: a.contentId,
    })),
  };
  
  const headers = {
    'Content-Type': 'application/json',
    ...(secret && { 'Authorization': `Bearer ${secret}` }),
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

function extractUserEmail(toEmail) {
  // Support multiple formats:
  // 1. invoices+userId@domain.com -> look up user by ID
  // 2. userId@invoices.domain.com -> subdomain routing
  // 3. Custom mapping via KV store
  
  // Simple approach: extract from plus addressing
  const plusMatch = toEmail.match(/^invoices\+(.+)@/i);
  if (plusMatch) {
    return plusMatch[1]; // This could be user ID or email
  }
  
  // Check for subdomain: userId@invoices.domain.com
  const subdomainMatch = toEmail.match(/^(.+)@invoices\./i);
  if (subdomainMatch) {
    return subdomainMatch[1];
  }
  
  // Default: use the full email as lookup key
  return toEmail;
}

// For local testing with wrangler
// wrangler dev --test-scheduled
export async function scheduled(event, env, ctx) {
  // Cron job for cleanup, retry failed, etc.
  console.log('Scheduled task ran at', new Date().toISOString());
}