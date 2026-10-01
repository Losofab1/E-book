package com.example.Biblioth.catalog;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.books.bookDto.BookResponse;
import com.example.Biblioth.books.bookService.BookService;
import com.example.Biblioth.digital.CatalogDocumentCirculationService;
import com.example.Biblioth.digital.dto.CatalogDocumentCirculationResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
    private final BookService bookService;
    private final CatalogDocumentRepository documentRepository;
    private final CatalogDocumentCirculationService circulationService;
    private final CatalogPreviewService previewService;

    public PublicCatalogController(
            BookService bookService,
            CatalogDocumentRepository documentRepository,
            CatalogDocumentCirculationService circulationService,
            CatalogPreviewService previewService
    ) {
        this.bookService = bookService;
        this.documentRepository = documentRepository;
        this.circulationService = circulationService;
        this.previewService = previewService;
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
        CatalogPreview preview = previewService.servePreview(id);
        boolean pdf = previewService.isPdf(preview.contentType(), preview.fileName());
        return ResponseEntity.ok()
                .contentType(pdf ? MediaType.APPLICATION_PDF : MediaType.TEXT_PLAIN)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"apercu-" + sanitize(preview.fileName()) + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .contentLength(preview.content().length)
                .body(preview.content());
    }

    private CatalogDocument findDocument(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catalogue introuvable."));
    }

    private String sanitize(String fileName) {
        return fileName == null ? "catalogue" : fileName.replace("\"", "");
    }
}
