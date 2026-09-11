package com.example.Biblioth.digital.dto;

import com.example.Biblioth.digital.PhysicalLoanStatus;
import java.time.LocalDateTime;

public class LoanResponse {
    private Long id;
    private Long userId;
    private Long bookId;
    private PhysicalLoanStatus status;
    private LocalDateTime borrowedAt;
    private LocalDateTime dueAt;

    public LoanResponse(Long id, Long userId, Long bookId, PhysicalLoanStatus status, LocalDateTime borrowedAt, LocalDateTime dueAt) {
        this.id = id;
        this.userId = userId;
        this.bookId = bookId;
        this.status = status;
        this.borrowedAt = borrowedAt;
        this.dueAt = dueAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getBookId() {
        return bookId;
    }

    public PhysicalLoanStatus getStatus() {
        return status;
    }

    public LocalDateTime getBorrowedAt() {
        return borrowedAt;
    }

    public LocalDateTime getDueAt() {
        return dueAt;
    }
}
