package com.example.Biblioth.digital;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import com.example.Biblioth.books.bookModel.BookEntity;
import com.example.Biblioth.books.bookRepository.BookRepository;
import com.example.Biblioth.digital.dto.DigitalAccessResponse;
import com.example.Biblioth.digital.dto.LoanExtensionRequest;
import com.example.Biblioth.digital.dto.LoanRequest;
import com.example.Biblioth.digital.dto.LoanResponse;
import com.example.Biblioth.digital.dto.ReservationRequest;
import com.example.Biblioth.digital.dto.ReservationResponse;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DigitalAccessService {
    private static final int DEFAULT_LOAN_DAYS = 14;
    private static final int RESERVATION_PICKUP_HOURS = 48;

    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final PhysicalLoanRepository physicalLoanRepository;
    private final ReservationRepository reservationRepository;
    private final DigitalAccessTokenRepository digitalAccessTokenRepository;

    public DigitalAccessService(
            UserRepository userRepository,
            BookRepository bookRepository,
            PhysicalLoanRepository physicalLoanRepository,
            ReservationRepository reservationRepository,
            DigitalAccessTokenRepository digitalAccessTokenRepository
    ) {
        this.userRepository = userRepository;
        this.bookRepository = bookRepository;
        this.physicalLoanRepository = physicalLoanRepository;
        this.reservationRepository = reservationRepository;
        this.digitalAccessTokenRepository = digitalAccessTokenRepository;
    }

    @Transactional
    public DigitalAccessResponse getAccessStatus(Long bookId, Authentication authentication) {
        LocalDateTime now = LocalDateTime.now();
        expireOutdatedWindows(now);

        BookEntity book = findBook(bookId);
        if (!book.isDigitalEnabled()) {
            return preview(book, "Aucune version numérique intégrale n'est disponible pour ce livre.");
        }

        if (authentication == null
                || authentication instanceof AnonymousAuthenticationToken
                || !authentication.isAuthenticated()) {
            return preview(book, "Connectez-vous pour vérifier l'accès au PDF intégral.");
        }

        return userRepository.findByEmail(authentication.getName())
                .map(user -> fullAccessIfEligible(user, book, now))
                .orElseGet(() -> preview(book, "Utilisateur introuvable."));
    }

    @Transactional(readOnly = true)
    public java.util.List<LoanResponse> getUserLoans(Long userId) {
        findUser(userId);
        return physicalLoanRepository.findByUserId(userId).stream()
                .map(this::mapLoan)
                .toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<ReservationResponse> getUserReservations(Long userId) {
        findUser(userId);
        return reservationRepository.findByUserId(userId).stream()
                .map(this::mapReservation)
                .toList();
    }

    @Transactional
    public LoanResponse createLoan(LoanRequest request) {
        LocalDateTime now = LocalDateTime.now();
        UserEntity user = findUser(request.getUserId());
        BookEntity book = findBook(request.getBookId());

        if (book.getAvailableCopies() == null || book.getAvailableCopies() < 1) {
            throw new IllegalArgumentException("Aucun exemplaire physique disponible pour ce prêt.");
        }

        PhysicalLoan loan = new PhysicalLoan();
        loan.setUser(user);
        loan.setBook(book);
        loan.setStatus(PhysicalLoanStatus.BORROWED);
        loan.setBorrowedAt(now);
        loan.setDueAt(request.getDueAt() == null ? now.plusDays(DEFAULT_LOAN_DAYS) : request.getDueAt());

        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepository.save(book);

        PhysicalLoan savedLoan = physicalLoanRepository.save(loan);
        ensureToken(user, book, DigitalAccessSourceType.LOAN, savedLoan.getId(), now, savedLoan.getDueAt());

        return mapLoan(savedLoan);
    }

    @Transactional
    public LoanResponse extendLoan(Long loanId, LoanExtensionRequest request) {
        LocalDateTime now = LocalDateTime.now();
        PhysicalLoan loan = physicalLoanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Prêt introuvable avec l'id : " + loanId));

        if (loan.getStatus() != PhysicalLoanStatus.BORROWED) {
            throw new IllegalArgumentException("Seul un prêt en cours peut être prolongé.");
        }

        loan.setDueAt(request.getDueAt());
        PhysicalLoan savedLoan = physicalLoanRepository.save(loan);
        ensureToken(loan.getUser(), loan.getBook(), DigitalAccessSourceType.LOAN, loan.getId(), now, savedLoan.getDueAt());

        return mapLoan(savedLoan);
    }

    @Transactional
    public ReservationResponse createReservation(ReservationRequest request) {
        LocalDateTime now = LocalDateTime.now();
        Reservation reservation = new Reservation();
        reservation.setUser(findUser(request.getUserId()));
        reservation.setBook(findBook(request.getBookId()));
        reservation.setStatus(ReservationStatus.WAITING);
        reservation.setReservedAt(now);

        return mapReservation(reservationRepository.save(reservation));
    }

    @Transactional
    public ReservationResponse markReservationReady(Long reservationId) {
        LocalDateTime now = LocalDateTime.now();
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Réservation introuvable avec l'id : " + reservationId));

        if (reservation.getStatus() != ReservationStatus.WAITING) {
            throw new IllegalArgumentException("Seule une réservation en attente peut être rendue disponible.");
        }

        reservation.setStatus(ReservationStatus.READY_FOR_PICKUP);
        reservation.setReadyAt(now);
        reservation.setPickupDeadline(now.plusHours(RESERVATION_PICKUP_HOURS));

        Reservation savedReservation = reservationRepository.save(reservation);
        ensureToken(
                savedReservation.getUser(),
                savedReservation.getBook(),
                DigitalAccessSourceType.RESERVATION,
                savedReservation.getId(),
                now,
                savedReservation.getPickupDeadline()
        );

        return mapReservation(savedReservation);
    }

    private DigitalAccessResponse fullAccessIfEligible(UserEntity user, BookEntity book, LocalDateTime now) {
        return physicalLoanRepository.findFirstByUserEmailAndBookIdAndStatusAndDueAtAfterOrderByDueAtDesc(
                        user.getEmail(),
                        book.getId(),
                        PhysicalLoanStatus.BORROWED,
                        now
                )
                .map(loan -> fullAccess(user, book, DigitalAccessSourceType.LOAN, loan.getId(), loan.getDueAt()))
                .orElseGet(() -> reservationRepository.findFirstByUserEmailAndBookIdAndStatusAndPickupDeadlineAfterOrderByPickupDeadlineDesc(
                                user.getEmail(),
                                book.getId(),
                                ReservationStatus.READY_FOR_PICKUP,
                                now
                        )
                        .map(reservation -> fullAccess(
                                user,
                                book,
                                DigitalAccessSourceType.RESERVATION,
                                reservation.getId(),
                                reservation.getPickupDeadline()
                        ))
                        .orElseGet(() -> preview(book, "Accès limité à l'aperçu ou aux métadonnées.")));
    }

    private DigitalAccessResponse fullAccess(
            UserEntity user,
            BookEntity book,
            DigitalAccessSourceType sourceType,
            Long sourceId,
            LocalDateTime expiresAt
    ) {
        DigitalAccessToken token = ensureToken(user, book, sourceType, sourceId, LocalDateTime.now(), expiresAt);
        return new DigitalAccessResponse(
                book.getId(),
                "FULL",
                true,
                book.getPreviewPageCount(),
                token.getExpiresAt(),
                sourceType.name(),
                token.getToken(),
                "Accès PDF intégral autorisé."
        );
    }

    private DigitalAccessResponse preview(BookEntity book, String message) {
        return new DigitalAccessResponse(
                book.getId(),
                "PREVIEW",
                false,
                book.getPreviewPageCount(),
                null,
                null,
                null,
                message
        );
    }

    private DigitalAccessToken ensureToken(
            UserEntity user,
            BookEntity book,
            DigitalAccessSourceType sourceType,
            Long sourceId,
            LocalDateTime startsAt,
            LocalDateTime expiresAt
    ) {
        return digitalAccessTokenRepository.findFirstByUserIdAndBookIdAndSourceTypeAndSourceIdAndStatus(
                        user.getId(),
                        book.getId(),
                        sourceType,
                        sourceId,
                        DigitalAccessTokenStatus.ACTIVE
                )
                .map(existing -> {
                    existing.setExpiresAt(expiresAt);
                    return digitalAccessTokenRepository.save(existing);
                })
                .orElseGet(() -> {
                    DigitalAccessToken token = new DigitalAccessToken();
                    token.setToken(UUID.randomUUID().toString());
                    token.setUser(user);
                    token.setBook(book);
                    token.setSourceType(sourceType);
                    token.setSourceId(sourceId);
                    token.setStatus(DigitalAccessTokenStatus.ACTIVE);
                    token.setStartsAt(startsAt);
                    token.setExpiresAt(expiresAt);
                    return digitalAccessTokenRepository.save(token);
                });
    }

    private void expireOutdatedWindows(LocalDateTime now) {
        digitalAccessTokenRepository.findByStatusAndExpiresAtBefore(DigitalAccessTokenStatus.ACTIVE, now)
                .forEach(token -> {
                    token.setStatus(DigitalAccessTokenStatus.EXPIRED);
                    digitalAccessTokenRepository.save(token);
                });

        reservationRepository.findByStatusAndPickupDeadlineBefore(ReservationStatus.READY_FOR_PICKUP, now)
                .forEach(reservation -> {
                    reservation.setStatus(ReservationStatus.EXPIRED);
                    reservationRepository.save(reservation);
                    digitalAccessTokenRepository.findBySourceTypeAndSourceIdAndStatus(
                                    DigitalAccessSourceType.RESERVATION,
                                    reservation.getId(),
                                    DigitalAccessTokenStatus.ACTIVE
                            )
                            .forEach(token -> {
                                token.setStatus(DigitalAccessTokenStatus.EXPIRED);
                                digitalAccessTokenRepository.save(token);
                            });
                });
    }

    private UserEntity findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable avec l'id : " + userId));
    }

    private BookEntity findBook(Long bookId) {
        return bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Livre introuvable avec l'id : " + bookId));
    }

    private LoanResponse mapLoan(PhysicalLoan loan) {
        return new LoanResponse(
                loan.getId(),
                loan.getUser().getId(),
                loan.getBook().getId(),
                loan.getStatus(),
                loan.getBorrowedAt(),
                loan.getDueAt()
        );
    }

    private ReservationResponse mapReservation(Reservation reservation) {
        return new ReservationResponse(
                reservation.getId(),
                reservation.getUser().getId(),
                reservation.getBook().getId(),
                reservation.getStatus(),
                reservation.getReservedAt(),
                reservation.getReadyAt(),
                reservation.getPickupDeadline()
        );
    }
}
