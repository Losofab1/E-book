package com.example.Biblioth.books.bookModel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Table(name = "books")
@Entity
public class BookEntity {

     @Id
     @GeneratedValue(strategy = GenerationType.IDENTITY)
     private Long id;

     @Column(nullable = false, length = 180)
     private String title;

     @Column(nullable = false, length = 140)
     private String author;

     @Column(unique = true, length = 32)
     private String isbn;

     @Column(length = 80)
     private String category;

     private Integer pages;

     private LocalDate publicationDate;

     @Column(nullable = false)
     private Integer totalCopies = 1;

     @Column(nullable = false)
     private Integer availableCopies = 1;

     @Column(nullable = false)
     private boolean active = true;

     @Column(nullable = false)
     private boolean digitalEnabled = false;

     @Column(nullable = false)
     private Integer previewPageCount = 0;

     @Column(length = 500)
     private String pdfStorageKey;

     @CreationTimestamp
     @Column(nullable = false, updatable = false)
     private LocalDateTime createdAt;

     @UpdateTimestamp
     private LocalDateTime updatedAt;

     public Long getId() {
          return id;
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
