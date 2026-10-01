package com.example.Biblioth.digital;

import com.example.Biblioth.digital.dto.CatalogDocumentCirculationResponse;
import com.example.Biblioth.digital.dto.CatalogDocumentLoanExtensionRequest;
import com.example.Biblioth.digital.dto.CatalogDocumentLoanRequest;
import com.example.Biblioth.digital.dto.CatalogDocumentLoanResponse;
import com.example.Biblioth.digital.dto.CatalogDocumentReservationRequest;
import com.example.Biblioth.digital.dto.CatalogDocumentReservationResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog-circulation")
public class CatalogDocumentCirculationController {
    private final CatalogDocumentCirculationService circulationService;

    public CatalogDocumentCirculationController(CatalogDocumentCirculationService circulationService) {
        this.circulationService = circulationService;
    }

    @GetMapping("/documents")
    public List<CatalogDocumentCirculationResponse> documents() {
        return circulationService.getDocuments();
    }

    @GetMapping("/loans")
    public List<CatalogDocumentLoanResponse> loans(Authentication authentication) {
        Long userId = isStaff(authentication) ? null : circulationService.getUserId(authentication.getName());
        return circulationService.getLoans(userId);
    }

    @PostMapping("/loans")
    public ResponseEntity<CatalogDocumentLoanResponse> createLoan(
            @Valid @RequestBody CatalogDocumentLoanRequest request, Authentication authentication) {
        if (!isStaff(authentication) && !circulationService.getUserId(authentication.getName()).equals(request.userId())) {
            throw new AccessDeniedException("Vous ne pouvez créer un emprunt que pour votre propre compte.");
        }
        return ResponseEntity.ok(circulationService.createLoan(request));
    }

    @PatchMapping("/loans/{loanId}/extend")
    public ResponseEntity<CatalogDocumentLoanResponse> extendLoan(
            @PathVariable Long loanId,
            @Valid @RequestBody CatalogDocumentLoanExtensionRequest request,
            Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(circulationService.extendLoan(loanId, request));
    }

    @PatchMapping("/loans/{loanId}/return")
    public ResponseEntity<CatalogDocumentLoanResponse> returnLoan(@PathVariable Long loanId, Authentication authentication) {
        if (!isStaff(authentication) && !circulationService.ownsLoan(loanId, authentication.getName())) {
            throw new AccessDeniedException("Vous ne pouvez retourner que votre propre prêt.");
        }
        return ResponseEntity.ok(circulationService.returnLoan(loanId));
    }

    @PatchMapping("/loans/{loanId}/cancel")
    public ResponseEntity<CatalogDocumentLoanResponse> cancelLoan(@PathVariable Long loanId, Authentication authentication) {
        if (!isStaff(authentication) && !circulationService.ownsLoan(loanId, authentication.getName())) {
            throw new AccessDeniedException("Vous ne pouvez annuler que votre propre prêt.");
        }
        return ResponseEntity.ok(circulationService.cancelLoan(loanId));
    }

    @GetMapping("/reservations")
    public List<CatalogDocumentReservationResponse> reservations(Authentication authentication) {
        Long userId = isStaff(authentication) ? null : circulationService.getUserId(authentication.getName());
        return circulationService.getReservations(userId);
    }

    @PostMapping("/reservations")
    public ResponseEntity<CatalogDocumentReservationResponse> createReservation(
            @Valid @RequestBody CatalogDocumentReservationRequest request, Authentication authentication) {
        if (!isStaff(authentication) && !circulationService.getUserId(authentication.getName()).equals(request.userId())) {
            throw new AccessDeniedException("Vous ne pouvez réserver un catalogue que pour votre propre compte.");
        }
        return ResponseEntity.ok(circulationService.createReservation(request));
    }

    @PatchMapping("/reservations/{reservationId}/ready")
    public ResponseEntity<CatalogDocumentReservationResponse> markReservationReady(
            @PathVariable Long reservationId, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(circulationService.markReservationReady(reservationId));
    }

    @PatchMapping("/reservations/{reservationId}/cancel")
    public ResponseEntity<CatalogDocumentReservationResponse> cancelReservation(
            @PathVariable Long reservationId, Authentication authentication) {
        if (!isStaff(authentication) && !circulationService.ownsReservation(reservationId, authentication.getName())) {
            throw new AccessDeniedException("Vous ne pouvez annuler que votre propre réservation.");
        }
        return ResponseEntity.ok(circulationService.cancelReservation(reservationId));
    }

    @PatchMapping("/reservations/{reservationId}/pickup")
    public ResponseEntity<CatalogDocumentLoanResponse> pickupReservation(
            @PathVariable Long reservationId, Authentication authentication) {
        if (!isStaff(authentication) && !circulationService.ownsReservation(reservationId, authentication.getName())) {
            throw new AccessDeniedException("Vous ne pouvez récupérer que votre propre réservation.");
        }
        return ResponseEntity.ok(circulationService.pickupReservation(reservationId));
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(authority ->
                authority.getAuthority().equals("ROLE_ADMIN") || authority.getAuthority().equals("ROLE_BIBLIOTHECAIRE"));
    }

    private void requireStaff(Authentication authentication) {
        if (!isStaff(authentication)) throw new AccessDeniedException("Accès réservé au personnel.");
    }
}