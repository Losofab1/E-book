package com.example.Biblioth.digital;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CatalogDocumentLoanRepository extends JpaRepository<CatalogDocumentLoan, Long> {
    boolean existsByCatalogDocumentIdAndStatus(Long catalogDocumentId, PhysicalLoanStatus status);
    Optional<CatalogDocumentLoan> findFirstByCatalogDocumentIdAndStatusOrderByDueAtDesc(Long catalogDocumentId, PhysicalLoanStatus status);
    List<CatalogDocumentLoan> findByUserIdOrderByBorrowedAtDesc(Long userId);
    List<CatalogDocumentLoan> findAllByOrderByBorrowedAtDesc();
}