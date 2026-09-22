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
        if (request == null) {
            throw new IllegalArgumentException("La requête d'inscription est obligatoire.");
        }

        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Un utilisateur existe deja avec cet email.");
        }

        String nom = safeTrim(request.getNom());
        String prenom = safeTrim(request.getPrenom());
        if (nom.isBlank() || prenom.isBlank()) {
            throw new IllegalArgumentException("Le nom et le prénom sont obligatoires.");
        }

        Role publicRole = resolvePublicRole(request.getRole());

        UserEntity user = new UserEntity();
        user.setNom(nom);
        user.setPrenom(prenom);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(safeTrim(request.getPassword())));
        user.setRole(publicRole);
        user.setActif(true);

        userRepository.save(user);

        return responseFor(user);
    }

    private Role resolvePublicRole(Role requestedRole) {
        if (requestedRole == Role.ETUDIANT || requestedRole == Role.PROFESSEUR || requestedRole == Role.ADHERENT) {
            return requestedRole;
        }
        return Role.ADHERENT;
    }

    public AuthResponse login(LoginRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La requête de connexion est obligatoire.");
        }

        String email = normalizeEmail(request.getEmail());
        String password = safeTrim(request.getPassword());

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Email ou mot de passe incorrect."));

        return responseFor(user);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("L'email est obligatoire.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private AuthResponse responseFor(UserEntity user) {
        return new AuthResponse(
                jwtUtil.generateToken(user),
                user.getRole().name(),
                user.getId(),
                (user.getNom() + " " + user.getPrenom()).trim(),
                user.getEmail()
        );
    }
}
