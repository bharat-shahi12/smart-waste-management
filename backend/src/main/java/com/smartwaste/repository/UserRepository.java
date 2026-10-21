package com.smartwaste.repository;

import com.smartwaste.entity.Role;
import com.smartwaste.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByResetPasswordToken(String resetPasswordToken);
    List<User> findByRole(Role role);
}
