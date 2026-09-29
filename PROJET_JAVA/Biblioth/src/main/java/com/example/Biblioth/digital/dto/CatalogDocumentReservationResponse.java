package com.example.Biblioth.digital.dto;

import com.example.Biblioth.digital.ReservationStatus;
import java.time.LocalDateTime;

public record CatalogDocumentReservationResponse(
        Long id,
        Long userId,
        String userName,
        Long catalogDocumentId,
        String catalogDocumentName,
        String contentType,
        ReservationStatus status,
        LocalDateTime reservedAt,
        LocalDateTime readyAt,
        LocalDateTime pickupDeadline
) {}