package com.example.Biblioth.digital.dto;

import java.time.LocalDateTime;

public record CatalogDocumentCirculationResponse(
        Long id,
        String name,
        String contentType,
        boolean available,
        LocalDateTime dueAt,
        long waitingReservations
) {}