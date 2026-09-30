package com.example.Biblioth.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Component
public class AdminInitializer implements ApplicationRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Logger logger = LoggerFactory.getLogger(AdminInitializer.class);

    @Value("${ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    @Value("${ADMIN_NOM:Admin}")
    private String adminNom;

    @Value("${ADMIN_PRENOM:Admin}")
    private String adminPrenom;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        String effectiveEmail = (adminEmail == null || adminEmail.isBlank())
                ? "admin@losofab"
                : adminEmail.trim().toLowerCase(Locale.ROOT);

        String effectivePassword = (adminPassword == null || adminPassword.isBlank())
                ? "Admin123!"
                : adminPassword.trim();

        if (userRepository.existsByEmail(effectiveEmail)) {
            logger.info("AdminInitializer: admin already exists for email {} - skipping.", effectiveEmail);
            return;
        }

        if (adminEmail == null || adminEmail.isBlank()) {
            logger.warn("AdminInitializer: ADMIN_EMAIL not configured. Using default admin credentials: {} / {}", effectiveEmail, effectivePassword);
        }

        UserEntity admin = new UserEntity();
        admin.setEmail(effectiveEmail);
        admin.setNom(adminNom);
        admin.setPrenom(adminPrenom);
        admin.setPassword(passwordEncoder.encode(effectivePassword));
        admin.setRole(Role.ADMIN);
        admin.setActif(true);

        userRepository.save(admin);
        logger.info("AdminInitializer: created admin user with email {}", effectiveEmail);
    }
}
