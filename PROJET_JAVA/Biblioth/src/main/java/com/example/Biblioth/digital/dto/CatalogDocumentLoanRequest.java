package com.example.Biblioth.digital.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record CatalogDocumentLoanRequest(
        @NotNull(message = "L'utilisateur est obligatoire.") Long userId,
        @NotNull(message = "Le catalogue est obligatoire.") Long catalogDocumentId,
        @Future(message = "La date de fin du prêt doit être dans le futur.") LocalDateTime dueAt
) {}