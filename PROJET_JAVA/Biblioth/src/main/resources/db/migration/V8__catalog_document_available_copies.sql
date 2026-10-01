ALTER TABLE catalog_documents ADD COLUMN IF NOT EXISTS available_copies INT NOT NULL DEFAULT 10;
UPDATE catalog_documents SET available_copies = 10 WHERE available_copies IS NULL;
-- Resynchronise le stock persistant à partir de l'historique des prêts en cours :
-- disponibles = total - empruntés (jamais négatif).
UPDATE catalog_documents SET available_copies = GREATEST(0, total_copies - (SELECT COUNT(*) FROM catalog_document_loans l WHERE l.catalog_document_id = catalog_documents.id AND l.status = 'BORROWED'));
