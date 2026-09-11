package com.example.Biblioth.Auth;

import com.example.Biblioth.User.UserEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@org.springframework.context.annotation.Profile({"local","dev","test"})
public class SimpleLoggingEmailService implements EmailService {
    private static final Logger log = LoggerFactory.getLogger(SimpleLoggingEmailService.class);

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void sendPasswordResetEmail(UserEntity user, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;
        // In production, replace with a proper mail sender implementation.
        log.info("[PasswordReset] send email to {} with link: {}", user.getEmail(), link);
    }
}
