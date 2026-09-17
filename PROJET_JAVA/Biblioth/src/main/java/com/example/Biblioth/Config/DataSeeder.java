package com.example.Biblioth.Config;

import com.example.Biblioth.User.Role;
import com.example.Biblioth.User.UserEntity;
import com.example.Biblioth.User.UserRepository;
import com.example.Biblioth.books.bookModel.BookEntity;
import com.example.Biblioth.books.bookRepository.BookRepository;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile({"local", "dev"})
public class DataSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, BookRepository bookRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.bookRepository = bookRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedUsers();
        seedBooks();
    }

    private void seedUsers() {
        UserEntity admin = userRepository.findByEmail("admin@losofab").orElseGet(() -> {
            UserEntity created = new UserEntity();
            created.setEmail("admin@losofab");
            created.setPassword(passwordEncoder.encode("Admin123!"));
            created.setRole(Role.ADMIN);
            created.setActif(true);
            return created;
        });
        if (admin.getId() == null) {
            admin.setNom("Admin");
            admin.setPrenom("System");
        }
        admin.setPhone("0153791179");
        admin.setAddress("fabricelodjou014@gmail.com");
        admin.setCity("Cotonou");
        userRepository.save(admin);

        if (!userRepository.existsByEmail("biblio@losofab")) {
            UserEntity biblio = new UserEntity();
            biblio.setNom("Bibli");
            biblio.setPrenom("Thecaire");
            biblio.setEmail("biblio@losofab");
            biblio.setPassword(passwordEncoder.encode("Biblio123!"));
            biblio.setRole(Role.BIBLIOTHECAIRE);
            biblio.setActif(true);
            userRepository.save(biblio);
        }

        if (!userRepository.existsByEmail("user@losofab")) {
            UserEntity user = new UserEntity();
            user.setNom("Jean");
            user.setPrenom("Dupont");
            user.setEmail("user@losofab");
            user.setPassword(passwordEncoder.encode("User123!"));
            user.setRole(Role.ADHERENT);
            user.setActif(true);
            userRepository.save(user);
        }
    }

    private void seedBooks() {
        if (bookRepository.count() == 0) {
            BookEntity b1 = new BookEntity();
            b1.setTitle("Le Petit Prince");
            b1.setAuthor("Antoine de Saint-Exupéry");
            b1.setIsbn("978-0156012195");
            b1.setCategory("Fiction");
            b1.setPages(96);
            b1.setPublicationDate(LocalDate.of(1943, 4, 6));
            b1.setTotalCopies(3);
            b1.setAvailableCopies(3);
            b1.setDigitalEnabled(true);
            b1.setPreviewPageCount(12);
            b1.setPdfStorageKey("demo/le-petit-prince.pdf");
            bookRepository.save(b1);

            BookEntity b2 = new BookEntity();
            b2.setTitle("Clean Code");
            b2.setAuthor("Robert C. Martin");
            b2.setIsbn("978-0132350884");
            b2.setCategory("Programming");
            b2.setPages(464);
            b2.setPublicationDate(LocalDate.of(2008, 8, 1));
            b2.setTotalCopies(2);
            b2.setAvailableCopies(2);
            b2.setDigitalEnabled(true);
            b2.setPreviewPageCount(18);
            b2.setPdfStorageKey("demo/clean-code.pdf");
            bookRepository.save(b2);
        }
    }
}
