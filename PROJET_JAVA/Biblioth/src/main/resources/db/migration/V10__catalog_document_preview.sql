ALTER TABLE catalog_documents ADD COLUMN IF NOT EXISTS preview_content BYTEA;
ALTER TABLE catalog_documents ADD COLUMN IF NOT EXISTS preview_content_type VARCHAR(255);
