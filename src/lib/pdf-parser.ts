import * as pdfParseLib from 'pdf-parse';

// Handle both pdf-parse v1 and v2 API shapes
const pdfParse = (pdfParseLib as any).default || pdfParseLib;

export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer);
    return typeof result === 'string' ? result : result.text;
  } catch (error) {
    console.error('PDF parse error:', error);
    throw new Error('Failed to parse PDF');
  }
}

export async function parsePDFFromBase64(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');
  return parsePDF(buffer);
}