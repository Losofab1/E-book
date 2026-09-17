package com.example.Biblioth.catalog;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "catalog_documents")
public class CatalogDocument {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String fileName;
    @Column(nullable = false) private String contentType;
    @Lob @Column(nullable = false) private byte[] content;
    @Column(nullable = false) private LocalDateTime uploadedAt;
    @Column(nullable = false) private String uploadedBy;
    public Long getId() { return id; } public String getFileName() { return fileName; } public void setFileName(String value) { fileName = value; }
    public String getContentType() { return contentType; } public void setContentType(String value) { contentType = value; }
    public byte[] getContent() { return content; } public void setContent(byte[] value) { content = value; }
    public LocalDateTime getUploadedAt() { return uploadedAt; } public void setUploadedAt(LocalDateTime value) { uploadedAt = value; }
    public String getUploadedBy() { return uploadedBy; } public void setUploadedBy(String value) { uploadedBy = value; }
}
