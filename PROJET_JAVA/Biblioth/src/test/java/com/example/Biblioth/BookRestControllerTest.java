package com.example.Biblioth;

import com.example.Biblioth.Auth.JwUtil;
import com.example.Biblioth.books.bookDto.BookResponse;
import com.example.Biblioth.books.bookRestController.BookRestController;
import com.example.Biblioth.books.bookService.BookService;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BookRestControllerTest {

    @Mock
    private BookService bookService;

    @Mock
    private JwUtil jwUtil;

    @InjectMocks
    private BookRestController bookRestController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(bookRestController).build();
    }

    @Test
    void shouldReturnListOfBooks() throws Exception {
        BookResponse bookResponse = new BookResponse(
                1L,
                "Le Petit Prince",
                "Antoine de Saint-Exupéry",
                "978-1234567890",
                "Littérature",
                96,
                LocalDate.of(1943, 4, 6),
                5,
                5,
                true,
                true,
                12,
                "demo/le-petit-prince.pdf"
        );

        when(bookService.search(null)).thenReturn(List.of(bookResponse));

        mockMvc.perform(get("/api/books")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Le Petit Prince"));
    }

    @Test
    void shouldImportCatalogCsv() throws Exception {
        MockMultipartFile csvFile = new MockMultipartFile(
                "file",
                "catalog.csv",
                MediaType.TEXT_PLAIN_VALUE,
                "Titre;Auteur;ISBN;Categorie\nLe Petit Prince;Antoine de Saint-Exupéry;978-1234567890;Littérature\n".getBytes()
        );

        when(bookService.importCsv(csvFile)).thenReturn(1);

        mockMvc.perform(multipart("/api/books/import").file(csvFile))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(1));
    }

    @Test
    void shouldImportCatalogPdf() throws Exception {
        MockMultipartFile pdfFile = new MockMultipartFile(
                "file",
                "catalog.pdf",
                "application/pdf",
                "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF".getBytes()
        );

        when(bookService.importCsv(pdfFile)).thenReturn(1);

        mockMvc.perform(multipart("/api/books/import").file(pdfFile))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(1));
    }
}
