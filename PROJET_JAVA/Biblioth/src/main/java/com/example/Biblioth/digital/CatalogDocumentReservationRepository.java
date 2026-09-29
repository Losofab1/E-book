package com.example.Biblioth.digital;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CatalogDocumentReservationRepository extends JpaRepository<CatalogDocumentReservation, Long> {
    boolean existsByUserIdAndCatalogDocumentIdAndStatusIn(Long userId, Long catalogDocumentId, Collection<ReservationStatus> statuses);
    long countByCatalogDocumentIdAndStatus(Long catalogDocumentId, ReservationStatus status);
    boolean existsByCatalogDocumentIdAndUserEmailAndStatusAndPickupDeadlineAfter(
            Long catalogDocumentId, String userEmail, ReservationStatus status, LocalDateTime now);
        boolean existsByCatalogDocumentIdAndStatusAndPickupDeadlineAfter(
            Long catalogDocumentId, ReservationStatus status, LocalDateTime now);
    Optional<CatalogDocumentReservation> findByIdAndUserEmail(Long id, String userEmail);
        Optional<CatalogDocumentReservation> findFirstByCatalogDocumentIdAndStatusOrderByReservedAtAsc(
            Long catalogDocumentId, ReservationStatus status);
    List<CatalogDocumentReservation> findByUserIdOrderByReservedAtDesc(Long userId);
    List<CatalogDocumentReservation> findAllByOrderByReservedAtDesc();
        List<CatalogDocumentReservation> findAllByOrderByReservedAtAsc();
        java.util.Optional<CatalogDocumentReservation> findFirstByCatalogDocumentIdAndStatusAndPickupDeadlineAfter(
            Long catalogDocumentId, ReservationStatus status, LocalDateTime now);
    List<CatalogDocumentReservation> findByStatusAndPickupDeadlineBefore(ReservationStatus status, LocalDateTime now);
}