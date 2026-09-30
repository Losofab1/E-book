ALTER TABLE catalog_documents
    ALTER COLUMN content TYPE bytea
    USING NULL::bytea;