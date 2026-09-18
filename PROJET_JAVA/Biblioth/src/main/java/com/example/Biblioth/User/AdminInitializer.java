package com.example.Biblioth.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;

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
        if (adminEmail == null || adminEmail.isBlank()) {
            logger.info("AdminInitializer: ADMIN_EMAIL not set - skipping admin creation.");
            return;
        }

        if (userRepository.existsByEmail(adminEmail)) {
            logger.info("AdminInitializer: admin already exists for email {} - skipping.", adminEmail);
            return;
        }

        String passwordToUse = adminPassword;
        if (passwordToUse == null || passwordToUse.isBlank()) {
            // generate a URL-safe 16-character password
            SecureRandom random = new SecureRandom();
            byte[] bytes = new byte[12];
            random.nextBytes(bytes);
            passwordToUse = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).substring(0, 16);
            // Log the generated password once so operator can copy it — this is intentional for initial provisioning.
            logger.warn("AdminInitializer: ADMIN_PASSWORD not provided. Generated password for {}: {}", adminEmail, passwordToUse);
        }

        UserEntity admin = new UserEntity();
        admin.setEmail(adminEmail);
        admin.setNom(adminNom);
        admin.setPrenom(adminPrenom);
        admin.setPassword(passwordEncoder.encode(passwordToUse));
        admin.setRole(Role.ADMIN);
        admin.setActif(true);

        userRepository.save(admin);
        logger.info("AdminInitializer: created admin user with email {}", adminEmail);
    }
}
