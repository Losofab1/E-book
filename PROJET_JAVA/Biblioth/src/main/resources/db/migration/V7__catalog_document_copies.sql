ALTER TABLE catalog_documents ADD COLUMN IF NOT EXISTS total_copies INT NOT NULL DEFAULT 10;
UPDATE catalog_documents SET total_copies = 10 WHERE total_copies IS NULL OR total_copies < 1;
