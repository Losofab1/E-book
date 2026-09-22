package com.example.Biblioth;

import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminPasswordReset {

    @Bean
    CommandLineRunner resetAdminPassword(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {

            UserEntity admin = userRepository
                    .findByEmail("admin@losofab")
                    .orElseThrow(() ->
                            new RuntimeException("Compte admin@losofab introuvable"));

            admin.setPassword(
                    passwordEncoder.encode("admin123!")
            );

            admin.setRole(com.example.Biblioth.User.Role.ADMIN);
            admin.setActif(true);

            userRepository.save(admin);

            System.out.println("======================================");
            System.out.println("Mot de passe ADMIN réinitialisé.");
            System.out.println("======================================");
        };
    }
}