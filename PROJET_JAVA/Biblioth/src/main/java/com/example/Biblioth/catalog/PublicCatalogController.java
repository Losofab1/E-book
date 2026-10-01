package com.example.Biblioth.catalog;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.books.bookDto.BookResponse;
import com.example.Biblioth.books.bookService.BookService;
import com.example.Biblioth.digital.CatalogDocumentCirculationService;
import com.example.Biblioth.digital.dto.CatalogDocumentCirculationResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lecture publique du catalogue : ouvrages actifs et documents importés,
 * sans authentification. Aucune donnée interne (stockage, usagers) n'est exposée.
 * L'aperçu public se limite à la première page (PDF) ou aux 20 premières
 * lignes (CSV) ; la lecture intégrale reste protégée par prêt/réservation.
 */
@RestController
@RequestMapping("/api/public")
public class PublicCatalogController {
    private static final int PREVIEW_CSV_LINES = 20;

    private final BookService bookService;
    private final CatalogDocumentRepository documentRepository;
    private final CatalogDocumentCirculationService circulationService;

    public PublicCatalogController(
            BookService bookService,
            CatalogDocumentRepository documentRepository,
            CatalogDocumentCirculationService circulationService
    ) {
        this.bookService = bookService;
        this.documentRepository = documentRepository;
        this.circulationService = circulationService;
    }

    @GetMapping("/books")
    public List<Map<String, Object>> books() {
        return bookService.search(null).stream()
                .filter(BookResponse::isActive)
                .map(book -> {
                    Map<String, Object> view = new LinkedHashMap<>();
                    view.put("id", book.getId());
                    view.put("title", book.getTitle());
                    view.put("author", book.getAuthor());
                    view.put("category", book.getCategory());
                    view.put("availableCopies", book.getAvailableCopies());
                    return view;
                })
                .toList();
    }

    @GetMapping("/catalogs")
    public List<CatalogDocumentCirculationResponse> catalogs() {
        return circulationService.getDocuments();
    }

    @GetMapping("/catalogs/{id}/access")
    public Map<String, Object> catalogAccess(@PathVariable Long id, Authentication authentication) {
        findDocument(id);
        return Map.of("fullAccess", circulationService.canAccess(id, authentication));
    }

    @GetMapping("/catalogs/{id}/preview")
    public ResponseEntity<byte[]> catalogPreview(@PathVariable Long id) {
        CatalogDocument document = findDocument(id);
        if (isPdf(document)) {
            byte[] firstPage = extractFirstPdfPage(document.getContent());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"apercu-" + sanitize(document.getFileName()) + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                    .contentLength(firstPage.length)
                    .body(firstPage);
        }
        byte[] preview = extractCsvPreview(document.getContent());
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .contentLength(preview.length)
                .body(preview);
    }

    private CatalogDocument findDocument(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catalogue introuvable."));
    }

    private boolean isPdf(CatalogDocument document) {
        if (document.getContentType() != null && document.getContentType().toLowerCase().contains("pdf")) return true;
        return document.getFileName() != null && document.getFileName().toLowerCase().endsWith(".pdf");
    }

    private String sanitize(String fileName) {
        return fileName == null ? "catalogue" : fileName.replace("\"", "");
    }

    private byte[] extractFirstPdfPage(byte[] pdfBytes) {
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
    private byte[] extractCsvPreview(byte[] content) {
        if (content == null || content.length == 0) {
            return new byte[0];
        }
        int limit = Math.min(content.length, 64 * 1024);
        String head = new String(content, 0, limit, StandardCharsets.UTF_8);
        String preview = Arrays.stream(head.split("\r?\n")).limit(PREVIEW_CSV_LINES).collect(Collectors.joining("\n"));
        return preview.getBytes(StandardCharsets.UTF_8);
    }
}
