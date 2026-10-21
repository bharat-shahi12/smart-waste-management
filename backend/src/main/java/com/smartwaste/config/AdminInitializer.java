package com.smartwaste.config;

import com.smartwaste.entity.Role;
import com.smartwaste.entity.User;
import com.smartwaste.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.ZonedDateTime;

@Configuration
public class AdminInitializer {

    @Bean
    public CommandLineRunner initAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByEmail("admin@smartwaste.com").isEmpty()) {
                User admin = new User();
                admin.setName("System Admin");
                admin.setEmail("admin@smartwaste.com");
                admin.setPassword(passwordEncoder.encode("admin123")); // Default password
                admin.setRole(Role.ADMIN);
                admin.setPhone("+919999999999");
                admin.setIsActive(true);
                admin.setCity("Central Admin");
                admin.setAddress("HQ");
                admin.setPincode("000000");
                admin.setCreatedAt(ZonedDateTime.now());
                admin.setUpdatedAt(ZonedDateTime.now());
                userRepository.save(admin);
                System.out.println("✅ DEFAULT ADMIN CREATED: admin@smartwaste.com / admin123");
            }
        };
    }
}
