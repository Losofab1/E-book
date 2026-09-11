package com.example.Biblioth.digital;

import com.example.Biblioth.digital.dto.DigitalAccessResponse;
import com.example.Biblioth.digital.dto.LoanExtensionRequest;
import com.example.Biblioth.digital.dto.LoanRequest;
import com.example.Biblioth.digital.dto.LoanResponse;
import com.example.Biblioth.digital.dto.ReservationRequest;
import com.example.Biblioth.digital.dto.ReservationResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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

    public DigitalAccessController(DigitalAccessService digitalAccessService) {
        this.digitalAccessService = digitalAccessService;
    }

    @GetMapping("/books/{bookId}/access")
    public ResponseEntity<DigitalAccessResponse> getAccessStatus(
            @PathVariable Long bookId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(digitalAccessService.getAccessStatus(bookId, authentication));
    }

    @PostMapping("/loans")
    public ResponseEntity<LoanResponse> createLoan(@Valid @RequestBody LoanRequest request) {
        return ResponseEntity.ok(digitalAccessService.createLoan(request));
    }

    @PatchMapping("/loans/{loanId}/extend")
    public ResponseEntity<LoanResponse> extendLoan(
            @PathVariable Long loanId,
            @Valid @RequestBody LoanExtensionRequest request
    ) {
        return ResponseEntity.ok(digitalAccessService.extendLoan(loanId, request));
    }

    @PostMapping("/reservations")
    public ResponseEntity<ReservationResponse> createReservation(@Valid @RequestBody ReservationRequest request) {
        return ResponseEntity.ok(digitalAccessService.createReservation(request));
    }

    @PatchMapping("/reservations/{reservationId}/ready")
    public ResponseEntity<ReservationResponse> markReservationReady(@PathVariable Long reservationId) {
        return ResponseEntity.ok(digitalAccessService.markReservationReady(reservationId));
    }
}
