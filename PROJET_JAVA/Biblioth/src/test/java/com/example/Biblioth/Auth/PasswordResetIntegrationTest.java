package com.example.Biblioth.Auth;

import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class PasswordResetIntegrationTest {
    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private EmailService emailService;

    @BeforeEach
    public void setup() {
        userRepository.deleteAll();
        UserEntity u = new UserEntity();
        u.setNom("Test");
        u.setPrenom("User");
        u.setEmail("prtest@local");
        u.setPassword(passwordEncoder.encode("OldPass123!"));
        u.setRole(com.example.Biblioth.User.Role.ADHERENT);
        u.setActif(true);
        userRepository.save(u);
    }

    @Test
    public void fullResetFlow() {
        // 1) request forgot-password
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"email\": \"prtest@local\"}";
        ResponseEntity<String> r1 = restTemplate.postForEntity("/api/auth/forgot-password", new HttpEntity<>(body, headers), String.class);
        assertThat(r1.getStatusCode()).isEqualTo(HttpStatus.OK);

        // capture token sent to emailService
        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(userCaptor.capture(), tokenCaptor.capture());
        String token = tokenCaptor.getValue();
        assertThat(token).isNotBlank();

        // 2) submit reset with token
        String resetBody = String.format("{\"token\": \"%s\", \"newPassword\": \"NewPass123!\"}", token);
        ResponseEntity<String> r2 = restTemplate.postForEntity("/api/auth/reset-password", new HttpEntity<>(resetBody, headers), String.class);
        assertThat(r2.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 3) login with new password
        String loginBody = "{\"email\": \"prtest@local\", \"password\": \"NewPass123!\"}";
        ResponseEntity<String> r3 = restTemplate.postForEntity("/api/auth/login", new HttpEntity<>(loginBody, headers), String.class);
        assertThat(r3.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r3.getBody()).contains("token");
    }
}
