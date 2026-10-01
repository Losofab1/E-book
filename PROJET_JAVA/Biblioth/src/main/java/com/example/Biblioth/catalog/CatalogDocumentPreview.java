package com.example.Biblioth.catalog;

/**
 * Aperçu stocké + métadonnées, sans la colonne {@code content} :
 * la lecture démarre sans charger jusqu'à 25 Mo.
 */
public interface CatalogDocumentPreview {
    byte[] getPreviewContent();
    String getPreviewContentType();
    String getContentType();
    String getFileName();
}
