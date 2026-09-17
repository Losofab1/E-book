package com.example.Biblioth.Auth;

public class AuthResponse {
    private String token;
    private String role;
    private Long id;
    private String name;
    private String email;

    public AuthResponse(String token, String role, Long id, String name, String email) {
        this.token = token;
        this.role = role;
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public String getToken() {
        return token;
    }

    public String getRole() {
        return role;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}
