-- Add OCR columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS text_confidence NUMERIC(5, 2);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parsed_content JSONB;