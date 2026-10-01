package com.example.Biblioth.catalog;

/**
 * Aperçu servi au lecteur : contenu + type + nom de fichier.
 */
public record CatalogPreview(byte[] content, String contentType, String fileName) {
}
