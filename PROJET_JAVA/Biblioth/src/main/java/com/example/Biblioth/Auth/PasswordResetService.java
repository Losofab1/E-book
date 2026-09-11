package com.example.Biblioth.Auth;

import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService
    ) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Transactional
    public void createTokenForEmail(String email) {
        String normalized = email == null ? null : email.trim().toLowerCase();
        Optional<UserEntity> maybeUser = userRepository.findByEmail(normalized);
        if (maybeUser.isEmpty()) {
            // Do not reveal whether email exists
            return;
        }

        UserEntity user = maybeUser.get();
        String rawToken = generateToken();
        String tokenHash = sha256Hex(rawToken);

        PasswordResetToken prt = new PasswordResetToken();
        prt.setUserId(user.getId());
        prt.setTokenHash(tokenHash);
        prt.setExpiresAt(LocalDateTime.now().plusHours(1));
        prt.setUsed(false);
        prt.setCreatedAt(LocalDateTime.now());
        tokenRepository.save(prt);

        emailService.sendPasswordResetEmail(user, rawToken);
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        String tokenHash = sha256Hex(rawToken);
        PasswordResetToken prt = tokenRepository.findByTokenHashAndUsedFalseAndExpiresAtAfter(tokenHash, LocalDateTime.now())
                .orElseThrow(() -> new IllegalArgumentException("Token invalide ou expiré."));

        UserEntity user = userRepository.findById(prt.getUserId()).orElseThrow(() -> new IllegalStateException("Utilisateur introuvable."));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        prt.setUsed(true);
        tokenRepository.save(prt);
    }

    private String generateToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
