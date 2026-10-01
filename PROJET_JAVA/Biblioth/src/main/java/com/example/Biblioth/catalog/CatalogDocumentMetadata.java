package com.example.Biblioth.catalog;

import java.time.LocalDateTime;

/**
 * Projection légère pour le listage : ne charge jamais la colonne
 * {@code content} (BYTEA, jusqu'à 25 Mo par document).
 */
public interface CatalogDocumentMetadata {
    Long getId();
    String getFileName();
    String getContentType();
    LocalDateTime getUploadedAt();
    Integer getTotalCopies();
}
