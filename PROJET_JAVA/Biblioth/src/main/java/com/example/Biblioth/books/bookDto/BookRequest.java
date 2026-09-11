package com.example.Biblioth.books.bookDto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class BookRequest {
    @NotBlank(message = "Le titre est obligatoire.")
    @Size(max = 180, message = "Le titre ne doit pas dépasser 180 caractères.")
    private String title;

    @NotBlank(message = "L'auteur est obligatoire.")
    @Size(max = 140, message = "L'auteur ne doit pas dépasser 140 caractères.")
    private String author;

    @NotBlank(message = "L'ISBN est obligatoire.")
    @Size(max = 32, message = "L'ISBN ne doit pas dépasser 32 caractères.")
    private String isbn;

    @Size(max = 80, message = "La catégorie ne doit pas dépasser 80 caractères.")
    private String category;

    @Min(value = 1, message = "Le nombre de pages doit être positif.")
    private Integer pages;

    private LocalDate publicationDate;

    @Min(value = 1, message = "Le nombre total d'exemplaires doit être positif.")
    private Integer totalCopies;

    private Boolean digitalEnabled;

    @Min(value = 0, message = "Le nombre de pages d'aperçu ne peut pas être négatif.")
    private Integer previewPageCount;

    @Size(max = 500, message = "La clé de stockage PDF ne doit pas dépasser 500 caractères.")
    private String pdfStorageKey;

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

    public Boolean getDigitalEnabled() {
        return digitalEnabled;
    }

    public void setDigitalEnabled(Boolean digitalEnabled) {
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
