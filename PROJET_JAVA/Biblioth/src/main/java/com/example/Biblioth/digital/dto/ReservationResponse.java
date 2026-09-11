package com.example.Biblioth.digital.dto;

import com.example.Biblioth.digital.ReservationStatus;
import java.time.LocalDateTime;

public class ReservationResponse {
    private Long id;
    private Long userId;
    private Long bookId;
    private ReservationStatus status;
    private LocalDateTime reservedAt;
    private LocalDateTime readyAt;
    private LocalDateTime pickupDeadline;

    public ReservationResponse(
            Long id,
            Long userId,
            Long bookId,
            ReservationStatus status,
            LocalDateTime reservedAt,
            LocalDateTime readyAt,
            LocalDateTime pickupDeadline
    ) {
        this.id = id;
        this.userId = userId;
        this.bookId = bookId;
        this.status = status;
        this.reservedAt = reservedAt;
        this.readyAt = readyAt;
        this.pickupDeadline = pickupDeadline;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getBookId() {
        return bookId;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public LocalDateTime getReservedAt() {
        return reservedAt;
    }

    public LocalDateTime getReadyAt() {
        return readyAt;
    }

    public LocalDateTime getPickupDeadline() {
        return pickupDeadline;
    }
}
