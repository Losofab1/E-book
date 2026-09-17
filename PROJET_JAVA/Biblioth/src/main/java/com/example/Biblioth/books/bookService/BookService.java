package com.example.Biblioth.books.bookService;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.books.bookDto.BookAvailabilityRequest;
import com.example.Biblioth.books.bookDto.BookRequest;
import com.example.Biblioth.books.bookDto.BookResponse;
import com.example.Biblioth.books.bookModel.BookEntity;
import com.example.Biblioth.books.bookRepository.BookRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class BookService {

    private final BookRepository bookRepository;

    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    public BookResponse findById(Long id) {
        BookEntity entity = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Livre introuvable avec l'id : " + id));
        return mapToResponse(entity);
    }

    public List<BookResponse> search(String query) {
        String normalizedQuery = query == null ? "" : query.trim();

        if (normalizedQuery.isEmpty()) {
            return bookRepository.findAll().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        return bookRepository.findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(
                        normalizedQuery,
                        normalizedQuery
                )
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BookResponse create(BookRequest request) {
        normalizeRequest(request);
        validateRequest(request);

        String isbn = normalizeIsbn(request.getIsbn());
        if (bookRepository.existsByIsbn(isbn)) {
            throw new IllegalArgumentException("L'ISBN existe déjà.");
        }

        BookEntity entity = new BookEntity();
        applyBookFields(entity, request, isbn);

        BookEntity savedEntity = bookRepository.save(entity);
        return mapToResponse(savedEntity);
    }

    public int importCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier d’import est obligatoire.");
        }

        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        boolean isCsv = filename.endsWith(".csv") || "text/csv".equals(contentType) || "application/csv".equals(contentType);
        boolean isPdf = filename.endsWith(".pdf") || "application/pdf".equals(contentType) || "application/octet-stream".equals(contentType) && filename.endsWith(".pdf");

        if (!isCsv && !isPdf) {
            throw new IllegalArgumentException("Le fichier importé doit être au format CSV ou PDF.");
        }

        if (isPdf) {
            return 1;
        }

        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            List<String> rows = new ArrayList<>();
            for (String rawLine : content.split("\\r?\\n")) {
                if (!rawLine.trim().isEmpty()) {
                    rows.add(rawLine);
                }
            }

            if (rows.size() < 2) {
                throw new IllegalArgumentException("Le fichier CSV est vide ou incomplet.");
            }

            String[] headers = parseCsvLine(rows.get(0));
            List<String> normalizedHeaders = new ArrayList<>();
            for (String header : headers) {
                normalizedHeaders.add(normalizeCsvHeader(header));
            }

            int titleIndex = normalizedHeaders.indexOf("titre");
            if (titleIndex == -1) {
                titleIndex = normalizedHeaders.indexOf("title");
            }
            int authorIndex = normalizedHeaders.indexOf("auteur");
            if (authorIndex == -1) {
                authorIndex = normalizedHeaders.indexOf("author");
            }
            int isbnIndex = normalizedHeaders.indexOf("isbn");
            if (isbnIndex == -1) {
                isbnIndex = normalizedHeaders.indexOf("isbn13");
            }
            int categoryIndex = normalizedHeaders.indexOf("categorie");
            if (categoryIndex == -1) {
                categoryIndex = normalizedHeaders.indexOf("category");
            }

            if (titleIndex < 0 || authorIndex < 0 || isbnIndex < 0) {
                throw new IllegalArgumentException("Le fichier CSV doit contenir au moins les colonnes Titre, Auteur et ISBN.");
            }

            int importedCount = 0;
            for (int index = 1; index < rows.size(); index++) {
                String[] values = parseCsvLine(rows.get(index));
                if (values.length == 0 || values.length <= Math.max(Math.max(titleIndex, authorIndex), Math.max(isbnIndex, categoryIndex))) {
                    continue;
                }

                String title = safeValue(values, titleIndex);
                String author = safeValue(values, authorIndex);
                String isbn = safeValue(values, isbnIndex);
                if (title.isBlank() || author.isBlank() || isbn.isBlank()) {
                    continue;
                }

                BookRequest request = new BookRequest();
                request.setTitle(title);
                request.setAuthor(author);
                request.setIsbn(isbn);
                request.setCategory(safeValue(values, categoryIndex));
                request.setTotalCopies(1);

                try {
                    create(request);
                    importedCount++;
                } catch (IllegalArgumentException ignored) {
                    // skip rows that already exist or are invalid to keep the import resilient
                }
            }

            if (importedCount == 0) {
                throw new IllegalArgumentException("Aucune ligne valide n’a pu être importée depuis le CSV.");
            }

            return importedCount;
        } catch (IOException exception) {
            throw new IllegalArgumentException("Impossible de lire le fichier importé.", exception);
        }
    }

    public BookResponse update(Long id, BookRequest request) {
        normalizeRequest(request);

        BookEntity entity = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Livre introuvable avec l'id : " + id));

        validateRequest(request);

        String isbn = normalizeIsbn(request.getIsbn());
        if (entity.getIsbn() == null || !entity.getIsbn().equalsIgnoreCase(isbn)) {
            if (bookRepository.existsByIsbn(isbn)) {
                throw new IllegalArgumentException("L'ISBN existe déjà.");
            }
        }

        applyBookFields(entity, request, isbn);

        BookEntity updatedEntity = bookRepository.save(entity);
        return mapToResponse(updatedEntity);
    }

    public BookResponse updateAvailability(Long id, BookAvailabilityRequest request) {
        BookEntity entity = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Livre introuvable avec l'id : " + id));

        Integer availableCopies = request == null || request.getAvailableCopies() == null
                ? entity.getAvailableCopies()
                : request.getAvailableCopies();

        int totalCopies = entity.getTotalCopies() == null ? 0 : entity.getTotalCopies();
        int resolvedAvailableCopies = availableCopies == null ? 0 : availableCopies;

        if (resolvedAvailableCopies < 0 || resolvedAvailableCopies > totalCopies) {
            throw new IllegalArgumentException("Le nombre de copies disponibles doit être compris entre 0 et le total des exemplaires.");
        }

        entity.setAvailableCopies(resolvedAvailableCopies);
        entity.setActive(resolvedAvailableCopies > 0 || totalCopies > 0);

        BookEntity updatedEntity = bookRepository.save(entity);
        return mapToResponse(updatedEntity);
    }

    public void delete(Long id) {
        if (!bookRepository.existsById(id)) {
            throw new ResourceNotFoundException("Livre introuvable avec l'id : " + id);
        }
        bookRepository.deleteById(id);
    }

    private void normalizeRequest(BookRequest request) {
        if (request == null) {
            return;
        }
        if (request.getTotalCopies() == null) {
            request.setTotalCopies(1);
        }
    }

    private void validateRequest(BookRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La requête est obligatoire.");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("Le titre est obligatoire.");
        }
        if (request.getAuthor() == null || request.getAuthor().isBlank()) {
            throw new IllegalArgumentException("L'auteur est obligatoire.");
        }
        if (request.getIsbn() == null || request.getIsbn().isBlank()) {
            throw new IllegalArgumentException("L'ISBN est obligatoire.");
        }
        if (request.getTotalCopies() == null || request.getTotalCopies() < 1) {
            request.setTotalCopies(1);
        }
    }

    private void applyBookFields(BookEntity entity, BookRequest request, String isbn) {
        entity.setTitle(request.getTitle().trim());
        entity.setAuthor(request.getAuthor().trim());
        entity.setIsbn(isbn);
        entity.setCategory(request.getCategory() == null ? null : request.getCategory().trim());
        entity.setPages(request.getPages());
        entity.setPublicationDate(request.getPublicationDate());
        entity.setTotalCopies(request.getTotalCopies());
        if (request.getDigitalEnabled() != null) {
            entity.setDigitalEnabled(request.getDigitalEnabled());
        }
        if (request.getPreviewPageCount() != null) {
            entity.setPreviewPageCount(request.getPreviewPageCount());
        }
        if (request.getPdfStorageKey() != null) {
            entity.setPdfStorageKey(request.getPdfStorageKey().trim());
        }

        if (entity.getAvailableCopies() == null) {
            entity.setAvailableCopies(request.getTotalCopies());
        } else if (entity.getAvailableCopies() > request.getTotalCopies()) {
            entity.setAvailableCopies(request.getTotalCopies());
        }
    }

    private String normalizeIsbn(String isbn) {
        return isbn == null ? null : isbn.trim().replace(" ", "").toUpperCase(Locale.ROOT);
    }

    private String normalizeCsvHeader(String value) {
        return value == null ? "" : value
                .replace("\uFEFF", "")
                .replaceAll("[\\p{M}]", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    private String[] parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean insideQuotes = false;

        for (int index = 0; index < line.length(); index++) {
            char currentChar = line.charAt(index);
            if (currentChar == '"') {
                if (insideQuotes && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    current.append('"');
                    index++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (currentChar == ';' && !insideQuotes) {
                values.add(current.toString().trim());
                current.setLength(0);
            } else if (currentChar == ',' && !insideQuotes) {
                values.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(currentChar);
            }
        }

        values.add(current.toString().trim());
        return values.toArray(new String[0]);
    }

    private String safeValue(String[] values, int index) {
        if (values == null || index < 0 || index >= values.length) {
            return "";
        }
        return values[index] == null ? "" : values[index].trim();
    }

    private BookResponse mapToResponse(BookEntity entity) {
        return new BookResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getAuthor(),
                entity.getIsbn(),
                entity.getCategory(),
                entity.getPages(),
                entity.getPublicationDate(),
                entity.getTotalCopies(),
                entity.getAvailableCopies(),
                entity.isActive(),
                entity.isDigitalEnabled(),
                entity.getPreviewPageCount(),
                entity.getPdfStorageKey()
        );
    }
}
