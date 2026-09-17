package com.example.Biblioth.digital;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhysicalLoanRepository extends JpaRepository<PhysicalLoan, Long> {
    Optional<PhysicalLoan> findFirstByUserEmailAndBookIdAndStatusAndDueAtAfterOrderByDueAtDesc(
            String email,
            Long bookId,
            PhysicalLoanStatus status,
            LocalDateTime now
    );

    List<PhysicalLoan> findByUserId(Long userId);

    List<PhysicalLoan> findAllByOrderByBorrowedAtDesc();
}
