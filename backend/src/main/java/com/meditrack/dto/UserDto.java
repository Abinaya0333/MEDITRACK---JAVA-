package com.meditrack.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

public class UserDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50)
        private String username;

        @NotBlank(message = "Email is required")
        @Email
        private String email;

        @NotBlank(message = "Full name is required")
        private String fullName;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        @NotBlank(message = "Role is required")
        private String role; // ADMIN or STAFF
    }

    @Data
    public static class UpdateRequest {
        private String fullName;
        @Email
        private String email;
        private String role;
        private Boolean active;
        private String password;
    }

    @Data
    public static class Response {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private boolean active;
        private LocalDateTime lastLogin;
        private LocalDateTime createdAt;
    }
}
