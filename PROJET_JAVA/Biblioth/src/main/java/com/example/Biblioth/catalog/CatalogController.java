package com.example.Biblioth.catalog;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.books.bookService.BookService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/catalogs")
public class CatalogController {
    private static final long MAX_SIZE = 25L * 1024 * 1024;
    private final CatalogDocumentRepository repository;
    private final BookService bookService;
    public CatalogController(CatalogDocumentRepository repository, BookService bookService) { this.repository = repository; this.bookService = bookService; }

    @GetMapping
    public List<Map<String, Object>> list() {
        return repository.findAll().stream().map(document -> Map.<String, Object>of("id", document.getId(), "name", document.getFileName(), "type", document.getContentType(), "uploadedAt", document.getUploadedAt())).toList();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("file") MultipartFile file, Authentication authentication) throws Exception {
        if (file.isEmpty() || file.getSize() > MAX_SIZE) throw new IllegalArgumentException("Le fichier doit peser entre 1 octet et 25 Mo.");
        String name = file.getOriginalFilename() == null ? "catalogue" : file.getOriginalFilename();
        String lower = name.toLowerCase();
        if (!lower.endsWith(".csv") && !lower.endsWith(".pdf")) throw new IllegalArgumentException("Seuls les formats CSV et PDF sont autorisés.");
        int imported = lower.endsWith(".csv") ? bookService.importCsv(file) : 0;
        CatalogDocument document = new CatalogDocument();
        document.setFileName(name); document.setContentType(lower.endsWith(".pdf") ? MediaType.APPLICATION_PDF_VALUE : "text/csv");
        document.setContent(file.getBytes()); document.setUploadedAt(LocalDateTime.now()); document.setUploadedBy(authentication.getName());
        CatalogDocument saved = repository.save(document);
        return ResponseEntity.ok(Map.of("id", saved.getId(), "importedCount", imported, "message", lower.endsWith(".pdf") ? "PDF archivé avec succès." : imported + " ouvrage(s) importé(s)."));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        CatalogDocument document = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Catalogue introuvable."));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(document.getContentType())).header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getFileName().replace("\"", "") + "\"").body(document.getContent());
    }
}
