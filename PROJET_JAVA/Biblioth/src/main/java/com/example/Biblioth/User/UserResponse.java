package com.example.Biblioth.User;

public record UserResponse(Long id, String name, String email, Role role, boolean actif, String phone, String address, String city, boolean system) {
    public static UserResponse from(UserEntity user) {
        return from(user, false);
    }

    public static UserResponse from(UserEntity user, boolean system) {
        String name = (user.getNom() + " " + user.getPrenom()).trim();
        return new UserResponse(user.getId(), name, user.getEmail(), user.getRole(), user.isActif(),
                user.getPhone(), user.getAddress(), user.getCity(), system);
    }
}
