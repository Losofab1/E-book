package com.example.Biblioth.digital.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class LoanRequest {
    @NotNull(message = "L'utilisateur est obligatoire.")
    private Long userId;

    @NotNull(message = "Le livre est obligatoire.")
    private Long bookId;

    @Future(message = "La date de fin du prêt doit être dans le futur.")
    private LocalDateTime dueAt;

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

    public LocalDateTime getDueAt() {
        return dueAt;
    }

    public void setDueAt(LocalDateTime dueAt) {
        this.dueAt = dueAt;
    }
}
