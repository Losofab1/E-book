package com.example.Biblioth;

import com.example.Biblioth.Auth.JwUtil;
import com.example.Biblioth.User.Role;
import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import com.example.Biblioth.books.bookModel.BookEntity;
import com.example.Biblioth.books.bookRepository.BookRepository;
import com.example.Biblioth.digital.DigitalAccessTokenRepository;
import com.example.Biblioth.digital.PhysicalLoanRepository;
import com.example.Biblioth.digital.ReservationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DigitalAccessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private PhysicalLoanRepository physicalLoanRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private DigitalAccessTokenRepository digitalAccessTokenRepository;

    private UserEntity admin;
    private UserEntity adherent;
    private BookEntity book;

    @BeforeEach
    void setUp() {
        digitalAccessTokenRepository.deleteAll();
        physicalLoanRepository.deleteAll();
        reservationRepository.deleteAll();
        bookRepository.deleteAll();
        userRepository.deleteAll();

        admin = saveUser("admin@losofab", Role.ADMIN);
        adherent = saveUser("reader@losofab", Role.ADHERENT);

        book = new BookEntity();
        book.setTitle("Digital Book");
        book.setAuthor("Author");
        book.setIsbn("DIGITAL-001");
        book.setTotalCopies(2);
        book.setAvailableCopies(2);
        book.setDigitalEnabled(true);
        book.setPreviewPageCount(10);
        book.setPdfStorageKey("demo/digital-book.pdf");
        book = bookRepository.save(book);
    }

    @Test
    void shouldUsePreviewByDefaultAndFullAccessAfterPhysicalLoan() throws Exception {
        mockMvc.perform(get("/api/digital/books/{bookId}/access", book.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("PREVIEW"))
                .andExpect(jsonPath("$.fullAccess").value(false))
                .andExpect(jsonPath("$.previewPageCount").value(10));

        mockMvc.perform(get("/api/digital/books/{bookId}/access", book.getId())
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(adherent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("PREVIEW"))
                .andExpect(jsonPath("$.fullAccess").value(false));

        mockMvc.perform(post("/api/digital/loans")
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", adherent.getId(),
                                "bookId", book.getId()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BORROWED"));

        mockMvc.perform(get("/api/digital/books/{bookId}/access", book.getId())
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(adherent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("FULL"))
                .andExpect(jsonPath("$.fullAccess").value(true))
                .andExpect(jsonPath("$.sourceType").value("LOAN"))
                .andExpect(jsonPath("$.accessToken", not(blankOrNullString())));
    }

    @Test
    void shouldExposeAliasRoutesForLoansAndReservations() throws Exception {
        mockMvc.perform(post("/api/loans")
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", adherent.getId(),
                                "bookId", book.getId()
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(adherent.getId()));

        String reservationJson = mockMvc.perform(post("/api/reservations")
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", adherent.getId(),
                                "bookId", book.getId()
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(adherent.getId()))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long reservationId = objectMapper.readTree(reservationJson).get("id").asLong();

        mockMvc.perform(get("/api/reservations/user/{userId}", adherent.getId())
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(adherent.getId()));

        mockMvc.perform(patch("/api/reservations/{reservationId}/ready", reservationId)
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY_FOR_PICKUP"));
    }

    @Test
    void shouldGrantFullAccessDuringReservationPickupWindow() throws Exception {
        String reservationPayload = objectMapper.writeValueAsString(Map.of(
                "userId", adherent.getId(),
                "bookId", book.getId()
        ));

        String reservationJson = mockMvc.perform(post("/api/digital/reservations")
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long reservationId = objectMapper.readTree(reservationJson).get("id").asLong();

        mockMvc.perform(patch("/api/digital/reservations/{reservationId}/ready", reservationId)
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY_FOR_PICKUP"))
                .andExpect(jsonPath("$.pickupDeadline").exists());

        mockMvc.perform(get("/api/digital/books/{bookId}/access", book.getId())
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(adherent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("FULL"))
                .andExpect(jsonPath("$.sourceType").value("RESERVATION"))
                .andExpect(jsonPath("$.accessToken", not(blankOrNullString())));
    }

    private UserEntity saveUser(String email, Role role) {
        UserEntity user = new UserEntity();
        user.setNom("Nom");
        user.setPrenom("Prenom");
        user.setEmail(email);
        user.setPassword("encoded-password");
        user.setRole(role);
        user.setActif(true);
        return userRepository.save(user);
    }
}
