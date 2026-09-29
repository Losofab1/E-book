package com.example.Biblioth.digital.dto;

import com.example.Biblioth.digital.PhysicalLoanStatus;
import java.time.LocalDateTime;

public record CatalogDocumentLoanResponse(
        Long id,
        Long userId,
        String userName,
        Long catalogDocumentId,
        String catalogDocumentName,
        String contentType,
        PhysicalLoanStatus status,
        LocalDateTime borrowedAt,
        LocalDateTime dueAt
) {}