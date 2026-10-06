package com.meditrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class AuthDto {

    @Data
    public static class LoginRequest {
        @NotBlank(message = "Username or email is required")
        private String username;
        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class LoginResponse {
        private String token;
        private String username;
        private String fullName;
        private String email;
        private String role;
        private Long userId;

        public LoginResponse(String token, String username, String fullName, String email, String role, Long userId) {
            this.token = token;
            this.username = username;
            this.fullName = fullName;
            this.email = email;
            this.role = role;
            this.userId = userId;
        }
    }
}
