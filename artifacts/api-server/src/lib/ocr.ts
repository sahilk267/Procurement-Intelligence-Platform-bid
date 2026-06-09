import Tesseract from 'tesseract.js';
import { logger } from './logger';

interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  processedAt: Date;
}

/**
 * Extract text from an image buffer using Tesseract OCR
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  language: string = 'eng'
): Promise<OCRResult> {
  try {
    const worker = await Tesseract.createWorker();
    
    const result = await worker.recognize(imageBuffer);
    const text = result.data.text;
    const confidence = result.data.confidence;

    await worker.terminate();

    logger.info(
      { 
        textLength: text.length,
        confidence,
        language 
      },
      'Successfully extracted text from image'
    );

    return {
      text,
      confidence,
      language,
      processedAt: new Date()
    };
  } catch (error) {
    logger.error({ error }, 'Failed to extract text from image');
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<OCRResult> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const data = await parser.getText();
    
    // Extract text from all pages
    const text = data.text || '';
    
    // Calculate a confidence score based on text extraction success
    const confidence = text.length > 0 ? 95 : 0;

    logger.info(
      {
        pages: data.total,
        textLength: text.length,
        confidence
      },
      'Successfully extracted text from PDF'
    );

    return {
      text,
      confidence,
      language: 'mixed',
      processedAt: new Date()
    };
  } catch (error) {
    logger.error({ error }, 'Failed to extract text from PDF');
    throw new Error(`PDF processing failed: ${error.message}`);
  } finally {
    await parser.destroy();
  }
}

/**
 * Extract text from document based on file type
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(buffer);
  } else if (
    mimeType.startsWith('image/') ||
    ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'].includes(mimeType)
  ) {
    return extractTextFromImage(buffer);
  } else {
    throw new Error(`Unsupported document type: ${mimeType}`);
  }
}

/**
 * Parse structured information from extracted text
 */
export function parseDocumentContent(
  text: string
): {
  title?: string;
  keywords: string[];
  sections: { heading: string; content: string }[];
  summary: string;
} {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Extract potential title (usually first non-empty line)
  const title = lines[0]?.substring(0, 100) || 'Untitled Document';
  
  // Extract keywords (capitalized words, likely headings)
  const keywords = [
    ...new Set(
      lines
        .filter(line => line.match(/^[A-Z][A-Z\s]+$/))
        .slice(0, 10)
        .map(line => line.trim())
    )
  ];

  // Create sections based on line grouping
  const sections: { heading: string; content: string }[] = [];
  let currentSection = { heading: '', content: '' };

  for (const line of lines) {
    if (line.match(/^[A-Z]/)) {
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      currentSection = { heading: line.substring(0, 50), content: '' };
    } else {
      currentSection.content += (currentSection.content ? ' ' : '') + line;
    }
  }

  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }

  // Generate summary (first 200 chars of content)
  const summary = text.substring(0, 200).trim() + '...';

  return {
    title,
    keywords,
    sections: sections.slice(0, 5), // Limit to 5 sections
    summary
  };
}

/**
 * Detect document language from extracted text
 */
export function detectLanguage(text: string): string {
  // Simple heuristic: check for common words in different languages
  const languages: { [key: string]: string[] } = {
    'hi': ['है', 'की', 'और', 'का'],
    'en': ['the', 'is', 'and', 'to', 'of'],
    'te': ['ఉ', 'ని', 'ఆ', 'కు'],
    'ta': ['உ', 'என', 'ன', 'ட']
  };

  const textLower = text.toLowerCase();
  let maxCount = 0;
  let detectedLanguage = 'mixed';

  for (const [lang, words] of Object.entries(languages)) {
    const count = words.filter(word => textLower.includes(word)).length;
    if (count > maxCount) {
      maxCount = count;
      detectedLanguage = lang;
    }
  }

  return detectedLanguage;
}
