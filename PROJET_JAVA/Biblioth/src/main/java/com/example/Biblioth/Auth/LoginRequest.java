package com.example.Biblioth.Auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {
    @NotBlank(message = "L'email est obligatoire.")
    @Email(message = "L'email est invalide.")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire.")
    private String password;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
