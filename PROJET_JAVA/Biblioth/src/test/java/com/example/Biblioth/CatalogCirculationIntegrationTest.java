package com.example.Biblioth;

import com.example.Biblioth.Auth.JwUtil;
import com.example.Biblioth.User.Role;
import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import com.example.Biblioth.catalog.CatalogDocument;
import com.example.Biblioth.catalog.CatalogDocumentRepository;
import com.example.Biblioth.digital.CatalogDocumentLoanRepository;
import com.example.Biblioth.digital.CatalogDocumentReservationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Preuve de non-régression du circuit catalogue : stock décrémenté à
 * l'emprunt et restauré au retour, un seul prêt actif par usager et par
 * catalogue, limite de 10 exemplaires, téléchargement réservé au personnel
 * et lecture intégrée via /content.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CatalogCirculationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CatalogDocumentRepository documentRepository;

    @Autowired
    private CatalogDocumentLoanRepository loanRepository;

    @Autowired
    private CatalogDocumentReservationRepository reservationRepository;

    private UserEntity admin;

    @BeforeEach
    void setUp() {
        cleanDatabase();
        admin = saveUser("admin@losofab", Role.ADMIN);
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    private void cleanDatabase() {
        loanRepository.deleteAll();
        reservationRepository.deleteAll();
        documentRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void loanDecrementsStockAndSecondSimultaneousLoanIsBlocked() throws Exception {
        UserEntity reader = saveUser("reader1@losofab", Role.ADHERENT);
        CatalogDocument document = saveDocument();

        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(reader.getId(), document.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BORROWED"));

        mockMvc.perform(get("/api/catalog-circulation/documents")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].availableCopies").value(9))
                .andExpect(jsonPath("$[0].borrowedCount").value(1));

        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(reader.getId(), document.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("déjà un emprunt")));
    }

    @Test
    void returnRestoresStockAndNewLoanBecomesPossible() throws Exception {
        UserEntity reader = saveUser("reader2@losofab", Role.ADHERENT);
        CatalogDocument document = saveDocument();

        String loanJson = mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(reader.getId(), document.getId())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Long loanId = objectMapper.readTree(loanJson).get("id").asLong();

        mockMvc.perform(patch("/api/catalog-circulation/loans/{loanId}/return", loanId)
                        .header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RETURNED"));

        mockMvc.perform(get("/api/catalog-circulation/documents")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].availableCopies").value(10));

        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(reader.getId(), document.getId())))
                .andExpect(status().isOk());
    }

    @Test
    void tenthLoanExhaustsStockAndReturnReopensIt() throws Exception {
        CatalogDocument document = saveDocument();
        List<UserEntity> readers = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            readers.add(saveUser("full" + i + "@losofab", Role.ADHERENT));
        }
        List<Long> loanIds = new ArrayList<>();
        for (UserEntity reader : readers) {
            String loanJson = mockMvc.perform(post("/api/catalog-circulation/loans")
                            .header("Authorization", bearer(reader))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loanPayload(reader.getId(), document.getId())))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            loanIds.add(objectMapper.readTree(loanJson).get("id").asLong());
        }

        UserEntity eleventh = saveUser("eleventh@losofab", Role.ADHERENT);
        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(eleventh))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(eleventh.getId(), document.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Limite atteinte")));

        mockMvc.perform(patch("/api/catalog-circulation/loans/{loanId}/return", loanIds.get(0))
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(eleventh))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(eleventh.getId(), document.getId())))
                .andExpect(status().isOk());
    }

    @Test
    void downloadIsStaffOnlyWhileContentServesBorrowers() throws Exception {
        UserEntity borrower = saveUser("borrower@losofab", Role.ADHERENT);
        UserEntity stranger = saveUser("stranger@losofab", Role.ADHERENT);
        CatalogDocument document = saveDocument();

        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(borrower))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(borrower.getId(), document.getId())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/catalogs/{id}/content", document.getId())
                        .header("Authorization", bearer(borrower)))
                .andExpect(status().isOk())
                .andExpect(content().bytes(document.getContent()));

        mockMvc.perform(get("/api/catalogs/{id}/content", document.getId())
                        .header("Authorization", bearer(stranger)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/catalogs/{id}/download", document.getId())
                        .header("Authorization", bearer(borrower)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/catalogs/{id}/download", document.getId())
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(content().bytes(document.getContent()));
    }

    @Test
    void deleteIsAdminOnlyAndBlockedByActiveLoans() throws Exception {
        UserEntity reader = saveUser("deletereader@losofab", Role.ADHERENT);
        CatalogDocument document = saveDocument();

        mockMvc.perform(delete("/api/catalogs/{id}", document.getId())
                        .header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());

        String loanJson = mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(reader.getId(), document.getId())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Long loanId = objectMapper.readTree(loanJson).get("id").asLong();

        mockMvc.perform(delete("/api/catalogs/{id}", document.getId())
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("encore empruntés")));

        mockMvc.perform(patch("/api/catalog-circulation/loans/{loanId}/return", loanId)
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/catalogs/{id}", document.getId())
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isNoContent());
    }

    private String loanPayload(Long userId, Long documentId) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "userId", userId,
                "catalogDocumentId", documentId));
    }

    @Test
    void contentServesPartialRangesToBorrowerOnly() throws Exception {
        UserEntity borrower = saveUser("rangeborrower@losofab", Role.ADHERENT);
        UserEntity stranger = saveUser("rangestranger@losofab", Role.ADHERENT);
        CatalogDocument document = saveDocument();
        int total = document.getContent().length;

        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(borrower))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(borrower.getId(), document.getId())))
                .andExpect(status().isOk());

        byte[] expected = java.util.Arrays.copyOfRange(document.getContent(), 0, 10);
        mockMvc.perform(get("/api/catalogs/{id}/content", document.getId())
                        .header("Authorization", bearer(borrower))
                        .header("Range", "bytes=0-9"))
                .andExpect(status().isPartialContent())
                .andExpect(content().bytes(expected));

        mockMvc.perform(get("/api/catalogs/{id}/content", document.getId())
                        .header("Authorization", bearer(stranger))
                        .header("Range", "bytes=0-9"))
                .andExpect(status().isForbidden());
    }

    @Test
    void everyBorrowerKeepsFullAccessWhenCopiesAreShared() throws Exception {
        UserEntity first = saveUser("sharedfirst@losofab", Role.ADHERENT);
        UserEntity second = saveUser("sharedsecond@losofab", Role.ADHERENT);
        CatalogDocument document = saveDocument();

        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(first))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(first.getId(), document.getId())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/catalog-circulation/loans")
                        .header("Authorization", bearer(second))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loanPayload(second.getId(), document.getId())))
                .andExpect(status().isOk());

        // Avant correction, seul le dernier prêt (échéance max) ouvrait l'accès.
        mockMvc.perform(get("/api/catalogs/{id}/content", document.getId())
                        .header("Authorization", bearer(first)))
                .andExpect(status().isOk())
                .andExpect(content().bytes(document.getContent()));

        mockMvc.perform(get("/api/catalogs/{id}/content", document.getId())
                        .header("Authorization", bearer(second)))
                .andExpect(status().isOk())
                .andExpect(content().bytes(document.getContent()));
    }

    private CatalogDocument saveDocument() {
        CatalogDocument document = new CatalogDocument();
        document.setFileName("catalogue.csv");
        document.setContentType("text/csv");
        document.setContent("Titre;Auteur\nLe Petit Prince;Saint-Exupery\n".getBytes(StandardCharsets.UTF_8));
        document.setUploadedAt(LocalDateTime.now());
        document.setUploadedBy(admin.getEmail());
        document.setTotalCopies(10);
        document.setAvailableCopies(10);
        return documentRepository.save(document);
    }

    private String bearer(UserEntity user) {
        return "Bearer " + jwtUtil.generateToken(user);
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
