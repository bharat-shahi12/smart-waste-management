package com.smartwaste.dto;

import lombok.Data;
import com.smartwaste.entity.Role;

@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private String phone;
    private String city;
    private String address;
    private String pincode;
    private Role role; // Added role so they can pick ADMIN, USER, etc. for project demo
}
