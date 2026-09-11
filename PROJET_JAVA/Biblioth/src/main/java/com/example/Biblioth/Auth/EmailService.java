package com.example.Biblioth.Auth;

import com.example.Biblioth.User.UserEntity;
import org.springframework.lang.NonNull;

public interface EmailService {
    void sendPasswordResetEmail(@NonNull UserEntity user, @NonNull String token);
}
