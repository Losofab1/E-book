package com.example.Biblioth.books.bookRestController;

import java.sql.Connection;
import javax.sql.DataSource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class ConnectTest {

    private final DataSource dataSource;

    public ConnectTest(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/db")
    public ResponseEntity<String> checkDbConnection() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(2)) {
                return ResponseEntity.ok("Connexion à la base réussie.");
            }
            return ResponseEntity.status(503).body("Connexion à la base indisponible.");
        } catch (Exception exception) {
            return ResponseEntity.status(503).body("Connexion à la base indisponible.");
        }
    }
}
