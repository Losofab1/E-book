package com.example.Biblioth.books.bookService;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.books.bookDto.BookAvailabilityRequest;
import com.example.Biblioth.books.bookDto.BookRequest;
import com.example.Biblioth.books.bookDto.BookResponse;
import com.example.Biblioth.books.bookModel.BookEntity;
import com.example.Biblioth.books.bookRepository.BookRepository;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

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
