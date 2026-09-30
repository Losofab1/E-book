package com.example.Biblioth.catalog;

import com.example.Biblioth.books.bookDto.BookResponse;
import com.example.Biblioth.books.bookService.BookService;
import com.example.Biblioth.digital.CatalogDocumentCirculationService;
import com.example.Biblioth.digital.dto.CatalogDocumentCirculationResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lecture publique du catalogue : ouvrages actifs et documents importés,
 * sans authentification. Aucune donnée interne (stockage, usagers) n'est exposée.
 */
@RestController
@RequestMapping("/api/public")
public class PublicCatalogController {
    private final BookService bookService;
    private final CatalogDocumentCirculationService circulationService;

    public PublicCatalogController(BookService bookService, CatalogDocumentCirculationService circulationService) {
        this.bookService = bookService;
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
}
