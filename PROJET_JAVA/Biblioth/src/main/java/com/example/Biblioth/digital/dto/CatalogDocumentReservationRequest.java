package com.example.Biblioth.digital.dto;

import jakarta.validation.constraints.NotNull;

public record CatalogDocumentReservationRequest(
        @NotNull(message = "L'utilisateur est obligatoire.") Long userId,
        @NotNull(message = "Le catalogue est obligatoire.") Long catalogDocumentId
) {}