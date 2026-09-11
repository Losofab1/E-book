package com.example.Biblioth.Auth;

import com.example.Biblioth.User.Role;
import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import java.util.Locale;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwUtil jwtUtil,
            AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Un utilisateur existe deja avec cet email.");
        }

        UserEntity user = new UserEntity();
        user.setNom(request.getNom().trim());
        user.setPrenom(request.getPrenom().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.ADHERENT);
        user.setActif(true);

        userRepository.save(user);

        return new AuthResponse(jwtUtil.generateToken(user), user.getRole().name());
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        UserEntity user = userRepository.findByEmail(email).orElseThrow();

        return new AuthResponse(jwtUtil.generateToken(user), user.getRole().name());
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("L'email est obligatoire.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
