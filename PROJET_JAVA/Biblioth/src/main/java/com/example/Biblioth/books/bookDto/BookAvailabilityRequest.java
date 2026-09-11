package com.example.Biblioth.books.bookDto;

import jakarta.validation.constraints.Min;

public class BookAvailabilityRequest {
    @Min(value = 0, message = "Le nombre de copies disponibles ne peut pas être négatif.")
    private Integer availableCopies;

    public Integer getAvailableCopies() {
        return availableCopies;
    }

    public void setAvailableCopies(Integer availableCopies) {
        this.availableCopies = availableCopies;
    }
}
