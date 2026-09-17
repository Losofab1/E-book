package com.example.Biblioth.digital;

import com.example.Biblioth.digital.dto.DigitalAccessResponse;
import com.example.Biblioth.digital.dto.LoanExtensionRequest;
import com.example.Biblioth.digital.dto.LoanRequest;
import com.example.Biblioth.digital.dto.LoanResponse;
import com.example.Biblioth.digital.dto.ReservationRequest;
import com.example.Biblioth.digital.dto.ReservationResponse;
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
@RequestMapping("/api/digital")
public class DigitalAccessController {
    private final DigitalAccessService digitalAccessService;

    public DigitalAccessController(DigitalAccessService digitalAccessService) { this.digitalAccessService = digitalAccessService; }

    @GetMapping("/books/{bookId}/access")
    public ResponseEntity<DigitalAccessResponse> getAccessStatus(@PathVariable Long bookId, Authentication authentication) {
        return ResponseEntity.ok(digitalAccessService.getAccessStatus(bookId, authentication));
    }

    @GetMapping("/loans")
    public ResponseEntity<List<LoanResponse>> loans(Authentication authentication) {
        return ResponseEntity.ok(isStaff(authentication) ? digitalAccessService.getAllLoans() : digitalAccessService.getLoansForEmail(authentication.getName()));
    }

    @PostMapping("/loans")
    public ResponseEntity<LoanResponse> createLoan(@Valid @RequestBody LoanRequest request, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(digitalAccessService.createLoan(request));
    }

    @PatchMapping("/loans/{loanId}/extend")
    public ResponseEntity<LoanResponse> extendLoan(@PathVariable Long loanId, @Valid @RequestBody LoanExtensionRequest request, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(digitalAccessService.extendLoan(loanId, request));
    }

    @PatchMapping("/loans/{loanId}/return")
    public ResponseEntity<LoanResponse> returnLoan(@PathVariable Long loanId, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(digitalAccessService.returnLoan(loanId));
    }

    @GetMapping("/reservations")
    public ResponseEntity<List<ReservationResponse>> reservations(Authentication authentication) {
        return ResponseEntity.ok(isStaff(authentication) ? digitalAccessService.getAllReservations() : digitalAccessService.getReservationsForEmail(authentication.getName()));
    }

    @PostMapping("/reservations")
    public ResponseEntity<ReservationResponse> createReservation(@Valid @RequestBody ReservationRequest request, Authentication authentication) {
        if (!isStaff(authentication) && !digitalAccessService.getUserIdForEmail(authentication.getName()).equals(request.getUserId())) {
            throw new AccessDeniedException("Vous ne pouvez créer une réservation que pour votre propre compte.");
        }
        return ResponseEntity.ok(digitalAccessService.createReservation(request));
    }

    @PatchMapping("/reservations/{reservationId}/ready")
    public ResponseEntity<ReservationResponse> markReservationReady(@PathVariable Long reservationId, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(digitalAccessService.markReservationReady(reservationId));
    }

    @PatchMapping("/reservations/{reservationId}/cancel")
    public ResponseEntity<ReservationResponse> cancelReservation(@PathVariable Long reservationId, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(digitalAccessService.cancelReservation(reservationId));
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN") || authority.getAuthority().equals("ROLE_BIBLIOTHECAIRE"));
    }

    private void requireStaff(Authentication authentication) {
        if (!isStaff(authentication)) throw new AccessDeniedException("Accès réservé au personnel.");
    }
}
