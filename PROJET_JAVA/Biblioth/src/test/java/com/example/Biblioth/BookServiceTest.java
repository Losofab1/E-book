package com.example.Biblioth;

import com.example.Biblioth.Config.ResourceNotFoundException;
import com.example.Biblioth.books.bookDto.BookAvailabilityRequest;
import com.example.Biblioth.books.bookDto.BookRequest;
import com.example.Biblioth.books.bookDto.BookResponse;
import com.example.Biblioth.books.bookModel.BookEntity;
import com.example.Biblioth.books.bookRepository.BookRepository;
import com.example.Biblioth.books.bookService.BookService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock
    private BookRepository bookRepository;

    @InjectMocks
    private BookService bookService;

    private BookEntity bookEntity;
    private BookRequest bookRequest;

    @BeforeEach
    void setUp() {
        bookEntity = new BookEntity();
        bookEntity.setTitle("Le Petit Prince");
        bookEntity.setAuthor("Antoine de Saint-Exupéry");
        bookEntity.setIsbn("978-1234567890");
        bookEntity.setTotalCopies(3);
        bookEntity.setAvailableCopies(2);

        bookRequest = new BookRequest();
        bookRequest.setTitle("Le Petit Prince");
        bookRequest.setAuthor("Antoine de Saint-Exupéry");
        bookRequest.setIsbn(" 978 1234567890 ");
        bookRequest.setTotalCopies(3);
    }

    @Test
    void findByIdShouldReturnMappedBookWhenBookExists() {
        when(bookRepository.findById(1L)).thenReturn(Optional.of(bookEntity));

        BookResponse response = bookService.findById(1L);

        assertEquals("Le Petit Prince", response.getTitle());
        assertEquals("Antoine de Saint-Exupéry", response.getAuthor());
        assertEquals(2, response.getAvailableCopies());
        verify(bookRepository).findById(1L);
    }

    @Test
    void findByIdShouldThrowNotFoundWhenBookDoesNotExist() {
        when(bookRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> bookService.findById(99L));
    }

    @Test
    void searchShouldReturnAllBooksWhenQueryIsBlank() {
        when(bookRepository.findAll()).thenReturn(List.of(bookEntity));

        List<BookResponse> result = bookService.search(" ");

        assertEquals(1, result.size());
        verify(bookRepository).findAll();
    }

    @Test
    void searchShouldUseTitleOrAuthorQueryWhenProvided() {
        when(bookRepository.findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase("Java", "Java"))
                .thenReturn(List.of(bookEntity));

        List<BookResponse> result = bookService.search("Java");

        assertEquals(1, result.size());
        verify(bookRepository).findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase("Java", "Java");
    }

    @Test
    void createShouldNormalizeIsbnAndSaveBook() {
        when(bookRepository.existsByIsbn(anyString())).thenReturn(false);
        when(bookRepository.save(any(BookEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookResponse response = bookService.create(bookRequest);

        assertNotNull(response);
        assertEquals("9781234567890", response.getIsbn());
        ArgumentCaptor<BookEntity> captor = ArgumentCaptor.forClass(BookEntity.class);
        verify(bookRepository).save(captor.capture());
        assertEquals("9781234567890", captor.getValue().getIsbn());
    }

    @Test
    void createShouldRejectDuplicateIsbn() {
        when(bookRepository.existsByIsbn(anyString())).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> bookService.create(bookRequest));

        verify(bookRepository, never()).save(any());
    }

    @Test
    void updateShouldThrowNotFoundWhenBookDoesNotExist() {
        when(bookRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> bookService.update(99L, bookRequest));

        verify(bookRepository, never()).save(any());
    }

    @Test
    void updateAvailabilityShouldUpdateWhenValueIsValid() {
        BookAvailabilityRequest availabilityRequest = new BookAvailabilityRequest();
        availabilityRequest.setAvailableCopies(1);
        when(bookRepository.findById(1L)).thenReturn(Optional.of(bookEntity));
        when(bookRepository.save(any(BookEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookResponse response = bookService.updateAvailability(1L, availabilityRequest);

        assertEquals(1, response.getAvailableCopies());
        verify(bookRepository).save(bookEntity);
    }

    @Test
    void updateAvailabilityShouldRejectValueGreaterThanTotalCopies() {
        BookAvailabilityRequest availabilityRequest = new BookAvailabilityRequest();
        availabilityRequest.setAvailableCopies(4);
        when(bookRepository.findById(1L)).thenReturn(Optional.of(bookEntity));

        assertThrows(IllegalArgumentException.class, () -> bookService.updateAvailability(1L, availabilityRequest));

        verify(bookRepository, never()).save(any());
    }

    @Test
    void deleteShouldRemoveExistingBook() {
        when(bookRepository.existsById(1L)).thenReturn(true);

        bookService.delete(1L);

        verify(bookRepository).deleteById(1L);
    }

    @Test
    void deleteShouldThrowNotFoundWhenBookDoesNotExist() {
        when(bookRepository.existsById(99L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> bookService.delete(99L));

        verify(bookRepository, never()).deleteById(99L);
    }
}
