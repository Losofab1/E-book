package com.example.Biblioth.digital.dto;

import java.time.LocalDateTime;

public class DigitalAccessResponse {
    private Long bookId;
    private String mode;
    private boolean fullAccess;
    private Integer previewPageCount;
    private LocalDateTime expiresAt;
    private String sourceType;
    private String accessToken;
    private String message;

    public DigitalAccessResponse() {
    }

    public DigitalAccessResponse(
            Long bookId,
            String mode,
            boolean fullAccess,
            Integer previewPageCount,
            LocalDateTime expiresAt,
            String sourceType,
            String accessToken,
            String message
    ) {
        this.bookId = bookId;
        this.mode = mode;
        this.fullAccess = fullAccess;
        this.previewPageCount = previewPageCount;
        this.expiresAt = expiresAt;
        this.sourceType = sourceType;
        this.accessToken = accessToken;
        this.message = message;
    }

    public Long getBookId() {
        return bookId;
    }

    public String getMode() {
        return mode;
    }

    public boolean isFullAccess() {
        return fullAccess;
    }

    public Integer getPreviewPageCount() {
        return previewPageCount;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public String getSourceType() {
        return sourceType;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getMessage() {
        return message;
    }
}
