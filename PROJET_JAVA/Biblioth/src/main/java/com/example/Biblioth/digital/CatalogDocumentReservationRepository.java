package com.example.Biblioth.digital;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CatalogDocumentReservationRepository extends JpaRepository<CatalogDocumentReservation, Long> {
    boolean existsByUserIdAndCatalogDocumentIdAndStatusIn(Long userId, Long catalogDocumentId, Collection<ReservationStatus> statuses);
    boolean existsByCatalogDocumentIdAndStatus(Long catalogDocumentId, ReservationStatus status);
    void deleteByCatalogDocumentId(Long catalogDocumentId);
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

    @Query("select reservation.catalogDocument.id, count(reservation) from CatalogDocumentReservation reservation "
            + "where reservation.status = :status group by reservation.catalogDocument.id")
    List<Object[]> countByStatusGrouped(@Param("status") ReservationStatus status);

    @Query("select reservation.catalogDocument.id, max(reservation.pickupDeadline) from CatalogDocumentReservation reservation "
            + "where reservation.status = :status and reservation.pickupDeadline > :now group by reservation.catalogDocument.id")
    List<Object[]> maxReadyDeadlineGrouped(@Param("status") ReservationStatus status, @Param("now") LocalDateTime now);

    @Modifying
    @Query("update CatalogDocumentReservation reservation set reservation.status = :expired "
            + "where reservation.status = :ready and reservation.pickupDeadline < :now")
    int expireReadyBulk(@Param("expired") ReservationStatus expired,
            @Param("ready") ReservationStatus ready,
            @Param("now") LocalDateTime now);
}