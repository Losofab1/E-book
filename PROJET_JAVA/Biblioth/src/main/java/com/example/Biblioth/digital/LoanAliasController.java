package com.example.Biblioth.digital;

import com.example.Biblioth.digital.dto.LoanExtensionRequest;
import com.example.Biblioth.digital.dto.LoanRequest;
import com.example.Biblioth.digital.dto.LoanResponse;
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
public class LoanAliasController {
    private final DigitalAccessService digitalAccessService;

    public LoanAliasController(DigitalAccessService digitalAccessService) {
        this.digitalAccessService = digitalAccessService;
    }

    @GetMapping("/loans/user/{userId}")
    public ResponseEntity<List<LoanResponse>> getUserLoans(@PathVariable Long userId) {
        return ResponseEntity.ok(digitalAccessService.getUserLoans(userId));
    }

    @PostMapping("/loans")
    public ResponseEntity<LoanResponse> createLoan(@Valid @RequestBody LoanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(digitalAccessService.createLoan(request));
    }

    @PatchMapping("/loans/{loanId}/extend")
    public ResponseEntity<LoanResponse> extendLoan(
            @PathVariable Long loanId,
            @Valid @RequestBody LoanExtensionRequest request
    ) {
        return ResponseEntity.ok(digitalAccessService.extendLoan(loanId, request));
    }
}
