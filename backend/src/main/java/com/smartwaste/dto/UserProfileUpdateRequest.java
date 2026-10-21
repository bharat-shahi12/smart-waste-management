package com.smartwaste.dto;

import lombok.Data;

@Data
public class UserProfileUpdateRequest {
    private String name;
    private String phone;
    private String city;
    private String address;
    private String pincode;
    private String savedArea;
    private String language;
    private String theme;
    private Boolean notificationsEnabled;
}
