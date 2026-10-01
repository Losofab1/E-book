package com.example.Biblioth.catalog;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.books.bookService.BookService;
import com.example.Biblioth.digital.CatalogDocumentCirculationService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/catalogs")
public class CatalogController {
    private static final long MAX_SIZE = 25L * 1024 * 1024;
    private final CatalogDocumentRepository repository;
    private final BookService bookService;
    private final CatalogDocumentCirculationService circulationService;
    public CatalogController(CatalogDocumentRepository repository, BookService bookService, CatalogDocumentCirculationService circulationService) { this.repository = repository; this.bookService = bookService; this.circulationService = circulationService; }

    @GetMapping
    public List<Map<String, Object>> list() {
        return repository.findAllMetadata().stream().map(document -> {
            java.util.Map<String, Object> view = new java.util.LinkedHashMap<>();
            int total = document.getTotalCopies() == null || document.getTotalCopies() < 1 ? 10 : document.getTotalCopies();
            int available = document.getAvailableCopies() == null ? total : Math.max(0, Math.min(total, document.getAvailableCopies()));
            view.put("id", document.getId());
            view.put("name", document.getFileName());
            view.put("type", document.getContentType());
            view.put("uploadedAt", document.getUploadedAt());
            view.put("totalCopies", total);
            view.put("availableCopies", available);
            return view;
        }).toList();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("file") MultipartFile file, Authentication authentication) {
        validateFile(file);
        String name = file.getOriginalFilename() == null || file.getOriginalFilename().isBlank() ? "catalogue" : file.getOriginalFilename();
        String lower = name.toLowerCase();
        int imported = lower.endsWith(".csv") ? bookService.importCsv(file) : 0;
        CatalogDocument saved = storeDocument(file, name, lower, authentication);
        return ResponseEntity.ok(Map.of("id", saved.getId(), "importedCount", imported, "message", lower.endsWith(".pdf") ? "PDF archivé avec succès." : imported + " ouvrage(s) importé(s)."));
    }

    @PostMapping(value = "/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadBatch(@RequestParam("files") java.util.List<MultipartFile> files, Authentication authentication) {
        if (files == null || files.isEmpty()) throw new IllegalArgumentException("Au moins un fichier est obligatoire.");
        java.util.List<Map<String, Object>> results = new java.util.ArrayList<>();
        int totalImportedBooks = 0;
        for (MultipartFile file : files) {
            String name = file == null || file.getOriginalFilename() == null || file.getOriginalFilename().isBlank() ? "catalogue" : file.getOriginalFilename();
            try {
                validateFile(file);
                String lower = name.toLowerCase();
                int imported = lower.endsWith(".csv") ? bookService.importCsv(file) : 0;
                CatalogDocument saved = storeDocument(file, name, lower, authentication);
                totalImportedBooks += imported;
                results.add(Map.of("name", name, "id", saved.getId(), "importedCount", imported, "ok", true));
            } catch (IllegalArgumentException exception) {
                results.add(Map.of("name", name, "ok", false, "error", String.valueOf(exception.getMessage())));
            } catch (Exception exception) {
                results.add(Map.of("name", name, "ok", false, "error", "Lecture impossible pour ce fichier."));
            }
        }
        return ResponseEntity.ok(Map.of(
                "importedDocuments", results.stream().filter(result -> Boolean.TRUE.equals(result.get("ok"))).count(),
                "totalImportedBooks", totalImportedBooks,
                "results", results,
                "message", results.stream().filter(result -> Boolean.TRUE.equals(result.get("ok"))).count() + " document(s) importé(s)."));
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_SIZE) throw new IllegalArgumentException("Le fichier doit peser entre 1 octet et 25 Mo.");
        String name = file.getOriginalFilename() == null ? "catalogue" : file.getOriginalFilename();
        String lower = name.toLowerCase();
        if (!lower.endsWith(".csv") && !lower.endsWith(".pdf")) throw new IllegalArgumentException("Seuls les formats CSV et PDF sont autorisés.");
    }

    private CatalogDocument storeDocument(MultipartFile file, String name, String lower, Authentication authentication) {
        try {
            CatalogDocument document = new CatalogDocument();
            document.setFileName(name); document.setContentType(lower.endsWith(".pdf") ? MediaType.APPLICATION_PDF_VALUE : "text/csv");
            document.setContent(file.getBytes()); document.setUploadedAt(LocalDateTime.now());
            document.setUploadedBy(authentication == null ? "system" : authentication.getName());
            document.setTotalCopies(10);
            document.setAvailableCopies(10);
            return repository.save(document);
        } catch (java.io.IOException exception) {
            throw new IllegalArgumentException("Impossible de lire le fichier importé.", exception);
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable Long id, Authentication authentication) {
        CatalogDocument document = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Catalogue introuvable."));
        if (!circulationService.canAccess(id, authentication)) {
            throw new AccessDeniedException("Un prêt actif ou une réservation disponible est nécessaire pour télécharger ce catalogue.");
        }
        byte[] content = document.getContent();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .contentLength(content == null ? 0 : content.length)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getFileName().replace("\"", "") + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(content);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"))) {
            throw new AccessDeniedException("Seul l'administrateur peut supprimer un catalogue.");
        }
        circulationService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }
}
