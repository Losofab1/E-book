package com.example.Biblioth.User;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository  extends JpaRepository<UserEntity , Long> {

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    List<UserEntity> findByRole(Role role);

    List<UserEntity> findByActifTrue();
}
