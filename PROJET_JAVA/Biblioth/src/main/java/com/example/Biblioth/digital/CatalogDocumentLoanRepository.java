package com.example.Biblioth.digital;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CatalogDocumentLoanRepository extends JpaRepository<CatalogDocumentLoan, Long> {
    boolean existsByCatalogDocumentIdAndStatus(Long catalogDocumentId, PhysicalLoanStatus status);
    boolean existsByUserIdAndCatalogDocumentIdAndStatus(Long userId, Long catalogDocumentId, PhysicalLoanStatus status);
    long countByCatalogDocumentIdAndStatus(Long catalogDocumentId, PhysicalLoanStatus status);
    void deleteByCatalogDocumentId(Long catalogDocumentId);
    Optional<CatalogDocumentLoan> findFirstByCatalogDocumentIdAndStatusOrderByDueAtDesc(Long catalogDocumentId, PhysicalLoanStatus status);
    List<CatalogDocumentLoan> findByUserIdOrderByBorrowedAtDesc(Long userId);
    List<CatalogDocumentLoan> findAllByOrderByBorrowedAtDesc();

    @Query("select loan.catalogDocument.id, count(loan) from CatalogDocumentLoan loan "
            + "where loan.status = :status group by loan.catalogDocument.id")
    List<Object[]> countBorrowedGrouped(@Param("status") PhysicalLoanStatus status);

    @Query("select loan.catalogDocument.id, max(loan.dueAt) from CatalogDocumentLoan loan "
            + "where loan.status = :status group by loan.catalogDocument.id")
    List<Object[]> maxDueAtGrouped(@Param("status") PhysicalLoanStatus status);
}