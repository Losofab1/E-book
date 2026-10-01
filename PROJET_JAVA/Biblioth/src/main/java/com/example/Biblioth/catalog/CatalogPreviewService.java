package com.example.Biblioth.catalog;

import com.example.Biblioth.Config.ResourceNotFoundException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aperçus légers des catalogues (1re page PDF / 20 premières lignes CSV).
 * L'aperçu est pré-calculé à l'import et servi tel quel : la lecture
 * démarre vite sur PC comme sur téléphone, sans reparser 25 Mo à chaque
 * clic sur « Lire ».
 */
@Service
public class CatalogPreviewService {
    private static final int PREVIEW_CSV_LINES = 20;

    private final CatalogDocumentRepository documentRepository;

    public CatalogPreviewService(CatalogDocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    /**
     * Sert l'aperçu stocké ; pour les documents importés avant son
     * introduction, le génère une fois puis le persiste (rattrapage).
     */
    @Transactional
    public CatalogPreview servePreview(Long documentId) {
        CatalogDocumentPreview stored = documentRepository.findPreviewById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Catalogue introuvable."));
        if (stored.getPreviewContent() != null && stored.getPreviewContent().length > 0) {
            String contentType = stored.getPreviewContentType() != null
                    ? stored.getPreviewContentType()
                    : previewContentType(stored.getContentType(), stored.getFileName());
            return new CatalogPreview(stored.getPreviewContent(), contentType, stored.getFileName());
        }
        CatalogDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Catalogue introuvable."));
        byte[] preview = buildPreview(document.getContent(), document.getContentType(), document.getFileName());
        document.setPreviewContent(preview);
        document.setPreviewContentType(previewContentType(document.getContentType(), document.getFileName()));
        documentRepository.save(document);
        return new CatalogPreview(preview, document.getPreviewContentType(), document.getFileName());
    }

    public boolean isPdf(String contentType, String fileName) {
        if (contentType != null && contentType.toLowerCase().contains("pdf")) return true;
        return fileName != null && fileName.toLowerCase().endsWith(".pdf");
    }

    public String previewContentType(String contentType, String fileName) {
        return isPdf(contentType, fileName) ? MediaType.APPLICATION_PDF_VALUE : MediaType.TEXT_PLAIN_VALUE;
    }

    public byte[] buildPreview(byte[] content, String contentType, String fileName) {
        if (isPdf(contentType, fileName)) {
            return extractFirstPdfPage(content);
        }
        return extractCsvPreview(content);
    }

    public byte[] extractFirstPdfPage(byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new IllegalArgumentException("Aperçu impossible pour ce PDF.");
        }
        try (java.io.InputStream in = new java.io.ByteArrayInputStream(pdfBytes);
                PDDocument source = PDDocument.load(in,
                org.apache.pdfbox.io.MemoryUsageSetting.setupTempFileOnly());
                PDDocument preview = new PDDocument()) {
            if (source.getNumberOfPages() == 0) {
                throw new IllegalArgumentException("Ce PDF ne contient aucune page lisible.");
            }
            preview.addPage(source.getPage(0));
            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                preview.save(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Aperçu impossible pour ce PDF.");
        }
    }

    /**
     * N'analyse que le début du fichier (64 Ko) au lieu de charger
     * l'intégralité d'un CSV de 25 Mo pour 20 lignes.
     */
    public byte[] extractCsvPreview(byte[] content) {
        if (content == null || content.length == 0) {
            return new byte[0];
        }
        int limit = Math.min(content.length, 64 * 1024);
        String head = new String(content, 0, limit, StandardCharsets.UTF_8);
        String preview = Arrays.stream(head.split("\r?\n")).limit(PREVIEW_CSV_LINES).collect(Collectors.joining("\n"));
        return preview.getBytes(StandardCharsets.UTF_8);
    }
}
