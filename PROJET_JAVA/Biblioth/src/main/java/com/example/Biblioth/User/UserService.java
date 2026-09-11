package com.example.Biblioth.User;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserEntity> getTousLesUtilisateurs() {
        return userRepository.findAll();
    }
}
