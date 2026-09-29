package com.example.Biblioth.catalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface CatalogDocumentRepository extends JpaRepository<CatalogDocument, Long> {
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select document from CatalogDocument document where document.id = :id")
	Optional<CatalogDocument> findByIdForUpdate(@Param("id") Long id);
}
