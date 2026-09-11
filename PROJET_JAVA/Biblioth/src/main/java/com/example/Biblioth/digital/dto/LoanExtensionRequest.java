package com.example.Biblioth.digital.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class LoanExtensionRequest {
    @NotNull(message = "La nouvelle date de fin est obligatoire.")
    @Future(message = "La nouvelle date de fin doit être dans le futur.")
    private LocalDateTime dueAt;

    public LocalDateTime getDueAt() {
        return dueAt;
    }

    public void setDueAt(LocalDateTime dueAt) {
        this.dueAt = dueAt;
    }
}
