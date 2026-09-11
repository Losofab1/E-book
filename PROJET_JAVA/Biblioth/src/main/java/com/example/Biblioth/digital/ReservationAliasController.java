package com.example.Biblioth.digital;

import com.example.Biblioth.digital.dto.ReservationRequest;
import com.example.Biblioth.digital.dto.ReservationResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ReservationAliasController {
    private final DigitalAccessService digitalAccessService;

    public ReservationAliasController(DigitalAccessService digitalAccessService) {
        this.digitalAccessService = digitalAccessService;
    }

    @GetMapping("/reservations/user/{userId}")
    public ResponseEntity<List<ReservationResponse>> getUserReservations(@PathVariable Long userId) {
        return ResponseEntity.ok(digitalAccessService.getUserReservations(userId));
    }

    @PostMapping("/reservations")
    public ResponseEntity<ReservationResponse> createReservation(@Valid @RequestBody ReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(digitalAccessService.createReservation(request));
    }

    @PatchMapping("/reservations/{reservationId}/ready")
    public ResponseEntity<ReservationResponse> markReservationReady(@PathVariable Long reservationId) {
        return ResponseEntity.ok(digitalAccessService.markReservationReady(reservationId));
    }
}
