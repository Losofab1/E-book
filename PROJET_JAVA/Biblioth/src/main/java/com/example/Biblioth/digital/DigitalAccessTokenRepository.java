package com.example.Biblioth.digital;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DigitalAccessTokenRepository extends JpaRepository<DigitalAccessToken, Long> {
    Optional<DigitalAccessToken> findFirstByUserIdAndBookIdAndSourceTypeAndSourceIdAndStatus(
            Long userId,
            Long bookId,
            DigitalAccessSourceType sourceType,
            Long sourceId,
            DigitalAccessTokenStatus status
    );

    List<DigitalAccessToken> findByStatusAndExpiresAtBefore(DigitalAccessTokenStatus status, LocalDateTime now);

    List<DigitalAccessToken> findBySourceTypeAndSourceIdAndStatus(
            DigitalAccessSourceType sourceType,
            Long sourceId,
            DigitalAccessTokenStatus status
    );
}
