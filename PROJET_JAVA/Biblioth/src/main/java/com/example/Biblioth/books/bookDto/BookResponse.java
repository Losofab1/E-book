package com.example.Biblioth.books.bookDto;

import java.time.LocalDate;

public class BookResponse {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String category;
    private Integer pages;
    private LocalDate publicationDate;
    private Integer totalCopies;
    private Integer availableCopies;
    private boolean active;
    private boolean digitalEnabled;
    private Integer previewPageCount;
    private String pdfStorageKey;

    public BookResponse() {
    }

    public BookResponse(
            Long id,
            String title,
            String author,
            String isbn,
            String category,
            Integer pages,
            LocalDate publicationDate,
            Integer totalCopies,
            Integer availableCopies,
            boolean active,
            boolean digitalEnabled,
            Integer previewPageCount,
            String pdfStorageKey
    ) {
        this.id = id;
        this.title = title;
        this.author = author;
        this.isbn = isbn;
        this.category = category;
        this.pages = pages;
        this.publicationDate = publicationDate;
        this.totalCopies = totalCopies;
        this.availableCopies = availableCopies;
        this.active = active;
        this.digitalEnabled = digitalEnabled;
        this.previewPageCount = previewPageCount;
        this.pdfStorageKey = pdfStorageKey;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getIsbn() {
        return isbn;
    }

    public void setIsbn(String isbn) {
        this.isbn = isbn;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getPages() {
        return pages;
    }

    public void setPages(Integer pages) {
        this.pages = pages;
    }

    public LocalDate getPublicationDate() {
        return publicationDate;
    }

    public void setPublicationDate(LocalDate publicationDate) {
        this.publicationDate = publicationDate;
    }

    public Integer getTotalCopies() {
        return totalCopies;
    }

    public void setTotalCopies(Integer totalCopies) {
        this.totalCopies = totalCopies;
    }

    public Integer getAvailableCopies() {
        return availableCopies;
    }

    public void setAvailableCopies(Integer availableCopies) {
        this.availableCopies = availableCopies;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isDigitalEnabled() {
        return digitalEnabled;
    }

    public void setDigitalEnabled(boolean digitalEnabled) {
        this.digitalEnabled = digitalEnabled;
    }

    public Integer getPreviewPageCount() {
        return previewPageCount;
    }

    public void setPreviewPageCount(Integer previewPageCount) {
        this.previewPageCount = previewPageCount;
    }

    public String getPdfStorageKey() {
        return pdfStorageKey;
    }

    public void setPdfStorageKey(String pdfStorageKey) {
        this.pdfStorageKey = pdfStorageKey;
    }
}
