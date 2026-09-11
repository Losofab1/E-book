package com.example.Biblioth.digital;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    Optional<Reservation> findFirstByUserEmailAndBookIdAndStatusAndPickupDeadlineAfterOrderByPickupDeadlineDesc(
            String email,
            Long bookId,
            ReservationStatus status,
            LocalDateTime now
    );

    List<Reservation> findByUserId(Long userId);

    List<Reservation> findByStatusAndPickupDeadlineBefore(ReservationStatus status, LocalDateTime now);
}
