package com.example.Biblioth.User;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public class ProfileUpdateRequest {
    @Size(max = 160, message = "Le nom ne doit pas dépasser 160 caractères.")
    private String name;

    @Email(message = "L'email est invalide.")
    @Size(max = 160, message = "L'email ne doit pas dépasser 160 caractères.")
    private String email;

    @Size(min = 6, max = 128, message = "Le mot de passe doit contenir entre 6 et 128 caractères.")
    private String password;

    @Size(max = 30, message = "Le téléphone ne doit pas dépasser 30 caractères.")
    private String phone;

    @Size(max = 200, message = "L'adresse ne doit pas dépasser 200 caractères.")
    private String address;

    @Size(max = 100, message = "La ville ne doit pas dépasser 100 caractères.")
    private String city;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
}
