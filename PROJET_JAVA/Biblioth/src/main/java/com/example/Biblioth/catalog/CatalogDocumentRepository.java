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

	/**
	 * Listage sans la colonne {@code content} : évite de charger N x 25 Mo en mémoire.
	 */
	@Query("select document.id as id, document.fileName as fileName, document.contentType as contentType, "
			+ "document.uploadedAt as uploadedAt, document.totalCopies as totalCopies, "
			+ "document.availableCopies as availableCopies "
			+ "from CatalogDocument document order by document.id desc")
	java.util.List<CatalogDocumentMetadata> findAllMetadata();

	@Query("select document.content from CatalogDocument document where document.id = :id")
	Optional<byte[]> findContentById(@Param("id") Long id);
}
