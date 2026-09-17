package com.example.Biblioth.User;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class AdminUserRequest {
    @NotBlank(message = "Le nom est obligatoire.")
    @Size(max = 160, message = "Le nom ne doit pas dépasser 160 caractères.")
    private String name;
    @NotBlank(message = "L'email est obligatoire.")
    @Email(message = "L'email est invalide.")
    private String email;
    @NotBlank(message = "Le mot de passe est obligatoire.")
    @Size(min = 6, max = 128, message = "Le mot de passe doit contenir entre 6 et 128 caractères.")
    private String password;
    @NotNull(message = "Le rôle est obligatoire.")
    private Role role;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
}
