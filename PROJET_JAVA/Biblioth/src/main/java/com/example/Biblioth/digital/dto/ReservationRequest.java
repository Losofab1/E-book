package com.example.Biblioth.digital.dto;

import jakarta.validation.constraints.NotNull;

public class ReservationRequest {
    @NotNull(message = "L'utilisateur est obligatoire.")
    private Long userId;

    @NotNull(message = "Le livre est obligatoire.")
    private Long bookId;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getBookId() {
        return bookId;
    }

    public void setBookId(Long bookId) {
        this.bookId = bookId;
    }
}
