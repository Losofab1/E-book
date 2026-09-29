package com.example.Biblioth.digital.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record CatalogDocumentLoanExtensionRequest(
        @NotNull(message = "La nouvelle échéance est obligatoire.")
        @Future(message = "La date de fin du prêt doit être dans le futur.")
        LocalDateTime dueAt
) {}