package com.example.Biblioth.digital;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import com.example.Biblioth.catalog.CatalogDocument;
import com.example.Biblioth.catalog.CatalogDocumentRepository;
import com.example.Biblioth.digital.dto.CatalogDocumentCirculationResponse;
import com.example.Biblioth.digital.dto.CatalogDocumentLoanExtensionRequest;
import com.example.Biblioth.digital.dto.CatalogDocumentLoanRequest;
import com.example.Biblioth.digital.dto.CatalogDocumentLoanResponse;
import com.example.Biblioth.digital.dto.CatalogDocumentReservationRequest;
import com.example.Biblioth.digital.dto.CatalogDocumentReservationResponse;
import com.example.Biblioth.notification.NotificationService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogDocumentCirculationService {
    private static final int DEFAULT_LOAN_DAYS = 14;
    private static final int RESERVATION_PICKUP_HOURS = 48;
    private static final List<ReservationStatus> ACTIVE_RESERVATION_STATUSES = List.of(
            ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP);

    private final CatalogDocumentRepository documentRepository;
    private final CatalogDocumentLoanRepository loanRepository;
    private final CatalogDocumentReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public CatalogDocumentCirculationService(
            CatalogDocumentRepository documentRepository,
            CatalogDocumentLoanRepository loanRepository,
            CatalogDocumentReservationRepository reservationRepository,
            UserRepository userRepository,
            NotificationService notificationService) {
        this.documentRepository = documentRepository;
        this.loanRepository = loanRepository;
        this.reservationRepository = reservationRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

        @Transactional
    public List<CatalogDocumentCirculationResponse> getDocuments() {
        expireReadyReservations();
        LocalDateTime now = LocalDateTime.now();
        java.util.List<com.example.Biblioth.catalog.CatalogDocumentMetadata> documents =
                documentRepository.findAllMetadata();
        if (documents.isEmpty()) {
            return List.of();
        }
        java.util.Map<Long, Long> borrowedByDoc = toCountMap(
                loanRepository.countBorrowedGrouped(PhysicalLoanStatus.BORROWED));
        java.util.Map<Long, LocalDateTime> dueAtByDoc = toDateMap(
                loanRepository.maxDueAtGrouped(PhysicalLoanStatus.BORROWED));
        java.util.Map<Long, Long> waitingByDoc = toCountMap(
                reservationRepository.countByStatusGrouped(ReservationStatus.WAITING));
        java.util.Map<Long, LocalDateTime> readyDeadlineByDoc = toDateMap(
                reservationRepository.maxReadyDeadlineGrouped(ReservationStatus.READY_FOR_PICKUP, now));
        return documents.stream().map(document -> {
            long borrowedCount = borrowedByDoc.getOrDefault(document.getId(), 0L);
            int total = totalCopies(document.getTotalCopies());
            int availableCopies = document.getAvailableCopies() == null
                    ? (int) Math.max(0, total - borrowedCount)
                    : Math.max(0, Math.min(total, document.getAvailableCopies()));
            long waitingReservations = waitingByDoc.getOrDefault(document.getId(), 0L);
            LocalDateTime readyDeadline = readyDeadlineByDoc.get(document.getId());
            boolean available = availableCopies > 0 && waitingReservations == 0 && readyDeadline == null;
            LocalDateTime dueAt = dueAtByDoc.get(document.getId());
            return new CatalogDocumentCirculationResponse(document.getId(), document.getFileName(),
                    document.getContentType(), available,
                    dueAt != null ? dueAt : readyDeadline, waitingReservations,
                    total, availableCopies, borrowedCount);
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<CatalogDocumentLoanResponse> getLoans(Long userId) {
        List<CatalogDocumentLoan> loans = userId == null
                ? loanRepository.findAllByOrderByBorrowedAtDesc()
                : loanRepository.findByUserIdOrderByBorrowedAtDesc(userId);
        return loans.stream().map(this::mapLoan).toList();
    }

    @Transactional
    public CatalogDocumentLoanResponse createLoan(CatalogDocumentLoanRequest request) {
        CatalogDocument document = findDocumentForUpdate(request.catalogDocumentId());
        UserEntity user = findUser(request.userId());
        if (loanRepository.existsByUserIdAndCatalogDocumentIdAndStatus(
                user.getId(), document.getId(), PhysicalLoanStatus.BORROWED)) {
            throw new IllegalArgumentException(
                    "Vous avez déjà un emprunt en cours pour ce catalogue. Retournez-le ou annulez-le avant d'en créer un nouveau.");
        }
        int total = totalCopies(document);
        int available = availableCopies(document);
        long borrowedCount = loanRepository.countByCatalogDocumentIdAndStatus(document.getId(), PhysicalLoanStatus.BORROWED);
        if (available < 1 || borrowedCount >= total) {
            throw new IllegalArgumentException(stockExhaustedMessage(total, borrowedCount));
        }
        if (reservationRepository.countByCatalogDocumentIdAndStatus(document.getId(), ReservationStatus.WAITING) > 0
                || reservationRepository.existsByCatalogDocumentIdAndStatusAndPickupDeadlineAfter(
                        document.getId(), ReservationStatus.READY_FOR_PICKUP, LocalDateTime.now())) {
            throw new IllegalArgumentException("Une réservation est prioritaire pour ce catalogue.");
        }
        LocalDateTime now = LocalDateTime.now();
        CatalogDocumentLoan loan = new CatalogDocumentLoan();
        loan.setUser(user);
        loan.setCatalogDocument(document);
        loan.setStatus(PhysicalLoanStatus.BORROWED);
        loan.setBorrowedAt(now);
        loan.setDueAt(request.dueAt() == null ? now.plusDays(DEFAULT_LOAN_DAYS) : request.dueAt());
        document.setAvailableCopies(available - 1);
        documentRepository.save(document);
        CatalogDocumentLoan saved = loanRepository.save(loan);
        notificationService.create(user.getEmail(), "catalog_loan_created",
                "Votre emprunt du catalogue « " + document.getFileName() + " » est enregistré.");
        return mapLoan(saved);
    }

    @Transactional
    public CatalogDocumentLoanResponse extendLoan(Long loanId, CatalogDocumentLoanExtensionRequest request) {
        CatalogDocumentLoan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Prêt de catalogue introuvable."));
        if (loan.getStatus() != PhysicalLoanStatus.BORROWED) {
            throw new IllegalArgumentException("Seul un prêt en cours peut être prolongé.");
        }
        loan.setDueAt(request.dueAt());
        return mapLoan(loanRepository.save(loan));
    }

    @Transactional
    public CatalogDocumentLoanResponse returnLoan(Long loanId) {
        CatalogDocumentLoan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Prêt de catalogue introuvable."));
        if (loan.getStatus() != PhysicalLoanStatus.BORROWED) {
            throw new IllegalArgumentException("Ce prêt est déjà clôturé.");
        }
        loan.setStatus(PhysicalLoanStatus.RETURNED);
        loan.setReturnedAt(LocalDateTime.now());
        incrementStock(loan.getCatalogDocument().getId());
        CatalogDocumentLoan saved = loanRepository.save(loan);
        notificationService.create(loan.getUser().getEmail(), "catalog_loan_returned",
                "Le retour du catalogue « " + loan.getCatalogDocument().getFileName() + " » est enregistré.");
        return mapLoan(saved);
    }

    @Transactional
    public CatalogDocumentLoanResponse cancelLoan(Long loanId) {
        CatalogDocumentLoan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Prêt de catalogue introuvable."));
        if (loan.getStatus() != PhysicalLoanStatus.BORROWED) {
            throw new IllegalArgumentException("Ce prêt est déjà clôturé.");
        }
        loan.setStatus(PhysicalLoanStatus.CANCELED);
        loan.setReturnedAt(LocalDateTime.now());
        incrementStock(loan.getCatalogDocument().getId());
        CatalogDocumentLoan saved = loanRepository.save(loan);
        notificationService.create(loan.getUser().getEmail(), "catalog_loan_canceled",
                "L'annulation du prêt du catalogue « " + loan.getCatalogDocument().getFileName() + " » est enregistrée.");
        return mapLoan(saved);
    }

    @Transactional
    public void deleteDocument(Long documentId) {
        CatalogDocument document = findDocumentForUpdate(documentId);
        if (loanRepository.existsByCatalogDocumentIdAndStatus(document.getId(), PhysicalLoanStatus.BORROWED)) {
            throw new IllegalArgumentException(
                    "Suppression impossible : des exemplaires sont encore empruntés. Attendez leur retour.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (reservationRepository.existsByCatalogDocumentIdAndStatus(document.getId(), ReservationStatus.WAITING)
                || reservationRepository.existsByCatalogDocumentIdAndStatusAndPickupDeadlineAfter(
                        document.getId(), ReservationStatus.READY_FOR_PICKUP, now)) {
            throw new IllegalArgumentException(
                    "Suppression impossible : des réservations actives existent pour ce catalogue.");
        }
        loanRepository.deleteByCatalogDocumentId(document.getId());
        reservationRepository.deleteByCatalogDocumentId(document.getId());
        documentRepository.delete(document);
    }

    @Transactional
    public List<CatalogDocumentReservationResponse> getReservations(Long userId) {        expireReadyReservations();
        List<CatalogDocumentReservation> reservations = userId == null
            ? reservationRepository.findAllByOrderByReservedAtAsc()
                : reservationRepository.findByUserIdOrderByReservedAtDesc(userId);
        return reservations.stream().map(this::mapReservation).toList();
    }

    @Transactional
    public CatalogDocumentReservationResponse createReservation(CatalogDocumentReservationRequest request) {
        expireReadyReservations();
        UserEntity user = findUser(request.userId());
        CatalogDocument document = findDocumentForUpdate(request.catalogDocumentId());
        if (reservationRepository.existsByUserIdAndCatalogDocumentIdAndStatusIn(
                user.getId(), document.getId(), ACTIVE_RESERVATION_STATUSES)) {
            throw new IllegalArgumentException("Vous avez déjà une réservation active pour ce catalogue.");
        }
        if (loanRepository.existsByUserIdAndCatalogDocumentIdAndStatus(
                user.getId(), document.getId(), PhysicalLoanStatus.BORROWED)) {
            throw new IllegalArgumentException(
                    "Vous avez déjà un emprunt en cours pour ce catalogue. Retournez-le ou annulez-le avant de le réserver.");
        }
        boolean full = availableCopies(document) < 1
                || loanRepository.countByCatalogDocumentIdAndStatus(
                    document.getId(), PhysicalLoanStatus.BORROWED) >= totalCopies(document);
        boolean alreadyReserved = reservationRepository.countByCatalogDocumentIdAndStatus(
            document.getId(), ReservationStatus.WAITING) > 0
            || reservationRepository.existsByCatalogDocumentIdAndStatusAndPickupDeadlineAfter(
                document.getId(), ReservationStatus.READY_FOR_PICKUP, LocalDateTime.now());
        if (!full && !alreadyReserved) {
            throw new IllegalArgumentException("Ce catalogue est disponible ; créez un prêt plutôt qu'une réservation.");
        }
        CatalogDocumentReservation reservation = new CatalogDocumentReservation();
        reservation.setUser(user);
        reservation.setCatalogDocument(document);
        reservation.setStatus(ReservationStatus.WAITING);
        reservation.setReservedAt(LocalDateTime.now());
        CatalogDocumentReservation saved = reservationRepository.save(reservation);
        notificationService.create(null, "catalog_reservation_created",
                "Nouvelle réservation pour le catalogue « " + document.getFileName() + " ».");
        return mapReservation(saved);
    }

    @Transactional
    public CatalogDocumentReservationResponse markReservationReady(Long reservationId) {
        expireReadyReservations();
        CatalogDocumentReservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Réservation de catalogue introuvable."));
        if (reservation.getStatus() != ReservationStatus.WAITING) {
            throw new IllegalArgumentException("Seule une réservation en attente peut être rendue disponible.");
        }
        CatalogDocumentReservation nextInQueue = reservationRepository
            .findFirstByCatalogDocumentIdAndStatusOrderByReservedAtAsc(
                reservation.getCatalogDocument().getId(), ReservationStatus.WAITING)
            .orElseThrow(() -> new ResourceNotFoundException("Réservation en attente introuvable."));
        if (!nextInQueue.getId().equals(reservationId)) {
            throw new IllegalArgumentException("Une réservation antérieure doit être traitée en premier.");
        }
        CatalogDocument lockedDocument = findDocumentForUpdate(reservation.getCatalogDocument().getId());
        long borrowedCount = loanRepository.countByCatalogDocumentIdAndStatus(
                lockedDocument.getId(), PhysicalLoanStatus.BORROWED);
        if (availableCopies(lockedDocument) < 1 || borrowedCount >= totalCopies(lockedDocument)) {
            throw new IllegalArgumentException(stockExhaustedMessage(totalCopies(lockedDocument), borrowedCount));
        }
        LocalDateTime now = LocalDateTime.now();
        if (reservationRepository.existsByCatalogDocumentIdAndStatusAndPickupDeadlineAfter(
                reservation.getCatalogDocument().getId(), ReservationStatus.READY_FOR_PICKUP, now)) {
            throw new IllegalArgumentException("Une autre réservation est déjà mise à disposition pour ce catalogue.");
        }
        reservation.setStatus(ReservationStatus.READY_FOR_PICKUP);
        reservation.setReadyAt(now);
        reservation.setPickupDeadline(now.plusHours(RESERVATION_PICKUP_HOURS));
        CatalogDocumentReservation saved = reservationRepository.save(reservation);
        notificationService.create(reservation.getUser().getEmail(), "catalog_reservation_ready",
                "Votre réservation du catalogue « " + reservation.getCatalogDocument().getFileName() + " » est disponible pendant 48 heures.");
        return mapReservation(saved);
    }

    @Transactional
    public CatalogDocumentReservationResponse cancelReservation(Long reservationId) {
        CatalogDocumentReservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Réservation de catalogue introuvable."));
        if (reservation.getStatus() != ReservationStatus.WAITING
                && reservation.getStatus() != ReservationStatus.READY_FOR_PICKUP) {
            throw new IllegalArgumentException("Seule une réservation en attente ou disponible peut être annulée.");
        }
        reservation.setStatus(ReservationStatus.CANCELED);
        reservation.setCanceledAt(LocalDateTime.now());
        return mapReservation(reservationRepository.save(reservation));
    }

    @Transactional
    public CatalogDocumentLoanResponse pickupReservation(Long reservationId) {
        expireReadyReservations();
        CatalogDocumentReservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Réservation de catalogue introuvable."));
        if (reservation.getStatus() != ReservationStatus.READY_FOR_PICKUP) {
            throw new IllegalArgumentException("Seule une réservation disponible peut être récupérée.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (reservation.getPickupDeadline() != null && reservation.getPickupDeadline().isBefore(now)) {
            reservation.setStatus(ReservationStatus.EXPIRED);
            reservationRepository.save(reservation);
            throw new IllegalArgumentException("Cette réservation a expiré.");
        }
        CatalogDocument document = findDocumentForUpdate(reservation.getCatalogDocument().getId());
        UserEntity user = reservation.getUser();
        if (loanRepository.existsByUserIdAndCatalogDocumentIdAndStatus(
                user.getId(), document.getId(), PhysicalLoanStatus.BORROWED)) {
            throw new IllegalArgumentException(
                    "Vous avez déjà un emprunt en cours pour ce catalogue. Retournez-le ou annulez-le avant de le récupérer.");
        }
        long borrowedCount = loanRepository.countByCatalogDocumentIdAndStatus(document.getId(), PhysicalLoanStatus.BORROWED);
        if (availableCopies(document) < 1 || borrowedCount >= totalCopies(document)) {
            throw new IllegalArgumentException(stockExhaustedMessage(totalCopies(document), borrowedCount));
        }
        CatalogDocumentLoan loan = new CatalogDocumentLoan();
        loan.setUser(user);
        loan.setCatalogDocument(document);
        loan.setStatus(PhysicalLoanStatus.BORROWED);
        loan.setBorrowedAt(now);
        loan.setDueAt(now.plusDays(DEFAULT_LOAN_DAYS));
        document.setAvailableCopies(availableCopies(document) - 1);
        documentRepository.save(document);
        CatalogDocumentLoan saved = loanRepository.save(loan);

        reservation.setStatus(ReservationStatus.PICKED_UP);
        reservationRepository.save(reservation);

        notificationService.create(user.getEmail(), "catalog_loan_created",
                "Votre récupération du catalogue « " + document.getFileName() + " » est enregistrée comme prêt.");
        return mapLoan(saved);
    }

    @Transactional(readOnly = true)
    public boolean ownsLoan(Long loanId, String email) {
        return loanRepository.findById(loanId)
                .map(loan -> loan.getUser().getEmail().equalsIgnoreCase(email))
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public boolean canAccess(Long documentId, Authentication authentication) {
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken || !authentication.isAuthenticated()) return false;
        if (isStaff(authentication)) return true;
        LocalDateTime now = LocalDateTime.now();
        // Un catalogue a jusqu'à 10 exemplaires : il faut vérifier le prêt
        // de l'usager connecté, pas seulement le dernier prêt toutes copies.
        if (loanRepository.existsByCatalogDocumentIdAndUserEmailIgnoreCaseAndStatusAndDueAtAfter(
                documentId, authentication.getName(), PhysicalLoanStatus.BORROWED, now)) {
            return true;
        }
        return reservationRepository.existsByCatalogDocumentIdAndUserEmailAndStatusAndPickupDeadlineAfter(
                documentId, authentication.getName(), ReservationStatus.READY_FOR_PICKUP, now);
    }

    @Transactional(readOnly = true)
    public Long getUserId(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."))
                .getId();
    }

    @Transactional(readOnly = true)
    public boolean ownsReservation(Long reservationId, String email) {
        return reservationRepository.findByIdAndUserEmail(reservationId, email).isPresent();
    }

    private void expireReadyReservations() {
        reservationRepository.expireReadyBulk(
                ReservationStatus.EXPIRED, ReservationStatus.READY_FOR_PICKUP, LocalDateTime.now());
    }

    private static java.util.Map<Long, Long> toCountMap(List<Object[]> rows) {
        java.util.Map<Long, Long> result = new java.util.HashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] instanceof Number id) {
                long count = row[1] instanceof Number number ? number.longValue() : 0L;
                result.put(id.longValue(), count);
            }
        }
        return result;
    }

    private static java.util.Map<Long, LocalDateTime> toDateMap(List<Object[]> rows) {
        java.util.Map<Long, LocalDateTime> result = new java.util.HashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] instanceof Number id && row[1] instanceof LocalDateTime date) {
                result.put(id.longValue(), date);
            }
        }
        return result;
    }

    private CatalogDocument findDocumentForUpdate(Long documentId) {
        return documentRepository.findByIdForUpdate(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Catalogue introuvable."));
    }

    private int totalCopies(CatalogDocument document) {
        return totalCopies(document == null ? null : document.getTotalCopies());
    }

    private int totalCopies(Integer total) {
        return total == null || total < 1 ? 10 : total;
    }

    private int availableCopies(CatalogDocument document) {
        if (document == null) {
            return 0;
        }
        if (document.getAvailableCopies() == null) {
            long borrowed = loanRepository.countByCatalogDocumentIdAndStatus(
                    document.getId(), PhysicalLoanStatus.BORROWED);
            return (int) Math.max(0, totalCopies(document) - borrowed);
        }
        return Math.max(0, Math.min(totalCopies(document), document.getAvailableCopies()));
    }

    private void incrementStock(Long documentId) {
        CatalogDocument document = findDocumentForUpdate(documentId);
        int total = totalCopies(document);
        int available = availableCopies(document);
        document.setAvailableCopies(Math.min(total, available + 1));
        documentRepository.save(document);
    }

    private String stockExhaustedMessage(int total, long borrowedCount) {
        return "Limite atteinte (" + borrowedCount + "/" + total
                + " exemplaire(s) emprunté(s)). Attendez le retour d'au moins un exemplaire avant un nouvel emprunt.";
    }

    private UserEntity findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(authority ->
                authority.getAuthority().equals("ROLE_ADMIN") || authority.getAuthority().equals("ROLE_BIBLIOTHECAIRE"));
    }

    private CatalogDocumentLoanResponse mapLoan(CatalogDocumentLoan loan) {
        UserEntity user = loan.getUser();
        CatalogDocument document = loan.getCatalogDocument();
        return new CatalogDocumentLoanResponse(loan.getId(), user.getId(), (user.getNom() + " " + user.getPrenom()).trim(),
                document.getId(), document.getFileName(), document.getContentType(), loan.getStatus(), loan.getBorrowedAt(), loan.getDueAt());
    }

    private CatalogDocumentReservationResponse mapReservation(CatalogDocumentReservation reservation) {
        UserEntity user = reservation.getUser();
        CatalogDocument document = reservation.getCatalogDocument();
        return new CatalogDocumentReservationResponse(reservation.getId(), user.getId(), (user.getNom() + " " + user.getPrenom()).trim(),
                document.getId(), document.getFileName(), document.getContentType(), reservation.getStatus(),
                reservation.getReservedAt(), reservation.getReadyAt(), reservation.getPickupDeadline());
    }
}