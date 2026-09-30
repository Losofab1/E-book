package com.example.Biblioth;

import com.example.Biblioth.Auth.LoginRequest;
import com.example.Biblioth.Auth.RegisterRequest;
import com.example.Biblioth.User.AdminInitializer;
import com.example.Biblioth.User.Role;
import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import com.example.Biblioth.digital.DigitalAccessTokenRepository;
import com.example.Biblioth.digital.PhysicalLoanRepository;
import com.example.Biblioth.digital.ReservationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DigitalAccessTokenRepository digitalAccessTokenRepository;

    @Autowired
    private PhysicalLoanRepository physicalLoanRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @BeforeEach
    void setUp() {
        digitalAccessTokenRepository.deleteAll();
        physicalLoanRepository.deleteAll();
        reservationRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void shouldRegisterLoginAndAccessProtectedBooksEndpoint() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setNom("Dupont");
        registerRequest.setPrenom("Alice");
        registerRequest.setEmail("alice@example.com");
        registerRequest.setPassword("secret123");
        registerRequest.setRole(Role.ADHERENT);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADHERENT"));

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("ALICE@EXAMPLE.COM");
        loginRequest.setPassword("secret123");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADHERENT"))
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("token")
                .asText();

        mockMvc.perform(get("/api/books")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void shouldCreateDefaultAdminWhenNoEnvironmentVariablesAreConfigured() throws Exception {
        UserRepository repository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        when(repository.existsByEmail("admin@losofab")).thenReturn(false);
        when(repository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminInitializer adminInitializer = new AdminInitializer(repository, passwordEncoder);
        ReflectionTestUtils.setField(adminInitializer, "adminEmail", "");
        ReflectionTestUtils.setField(adminInitializer, "adminPassword", "");

        adminInitializer.run(new DefaultApplicationArguments(new String[0]));

        verify(repository).save(any(UserEntity.class));
    }

    @Test
    void shouldRejectAccessToBooksWithoutToken() throws Exception {
        mockMvc.perform(get("/api/books"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectAccessToBooksWithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/books")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldForceAdherentRoleOnPublicRegister() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setNom("Boss");
        registerRequest.setPrenom("Root");
        registerRequest.setEmail("boss@example.com");
        registerRequest.setPassword("secret123");
        registerRequest.setRole(Role.ADMIN);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADHERENT"));

        assertEquals(Role.ADHERENT, userRepository.findByEmail("boss@example.com").orElseThrow().getRole());
    }

    @Test
    void shouldKeepPublicMemberRoleForPublicRegister() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setNom("Martin");
        registerRequest.setPrenom("Claire");
        registerRequest.setEmail("claire@example.com");
        registerRequest.setPassword("secret123");
        registerRequest.setRole(Role.PROFESSEUR);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("PROFESSEUR"));

        assertEquals(Role.PROFESSEUR, userRepository.findByEmail("claire@example.com").orElseThrow().getRole());
    }

    @Test
    void shouldRejectInvalidRegisterPayload() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setNom("Dupont");
        registerRequest.setPrenom("Alice");
        registerRequest.setEmail("not-an-email");
        registerRequest.setPassword("short");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.email").exists())
                .andExpect(jsonPath("$.fields.password").exists());
    }

    @Test
    void shouldRejectLoginWithBadCredentials() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("missing@example.com");
        loginRequest.setPassword("wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }
}
