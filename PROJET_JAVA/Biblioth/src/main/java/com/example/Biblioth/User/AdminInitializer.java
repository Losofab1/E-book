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
        boolean usingDefaults = (adminEmail == null || adminEmail.isBlank())
                || (adminPassword == null || adminPassword.isBlank());

        String effectiveEmail = (adminEmail == null || adminEmail.isBlank())
                ? "fabricelodjou014@gmail.com"
                : adminEmail.trim().toLowerCase(Locale.ROOT);

        String effectivePassword = (adminPassword == null || adminPassword.isBlank())
                ? "Admin12345!"
                : adminPassword.trim();

        var existing = userRepository.findByEmail(effectiveEmail);
        if (existing.isPresent()) {
            UserEntity admin = existing.get();
            boolean passwordConfigured = adminPassword != null && !adminPassword.isBlank();
            if (passwordConfigured && !passwordEncoder.matches(effectivePassword, admin.getPassword())) {
                admin.setPassword(passwordEncoder.encode(effectivePassword));
                admin.setRole(Role.ADMIN);
                admin.setActif(true);
                userRepository.save(admin);
                logger.info("AdminInitializer: admin password resynchronised for email {}", effectiveEmail);
            } else {
                logger.info("AdminInitializer: admin already exists for email {} - skipping.", effectiveEmail);
            }
            return;
        }

        if (usingDefaults) {
            logger.warn("AdminInitializer: ADMIN_EMAIL/ADMIN_PASSWORD not fully configured. Using default admin {}", effectiveEmail);
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
