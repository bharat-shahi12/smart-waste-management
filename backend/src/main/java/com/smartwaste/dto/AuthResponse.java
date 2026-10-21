package com.smartwaste.dto;
import lombok.Data;
import lombok.AllArgsConstructor;
import com.smartwaste.entity.Role;
@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Long userId;
    private String name;
    private Role role;
}
