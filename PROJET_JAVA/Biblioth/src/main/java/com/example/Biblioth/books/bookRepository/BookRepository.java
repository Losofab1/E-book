package com.example.Biblioth.books.bookRepository;

import com.example.Biblioth.books.bookModel.BookEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;



@Repository
public interface BookRepository extends JpaRepository<BookEntity, Long> {

    Optional<BookEntity> findByIsbn(String isbn);

    boolean existsByIsbn(String isbn);

    List<BookEntity> findByActiveTrue();

    List<BookEntity> findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(String title, String author);

}
