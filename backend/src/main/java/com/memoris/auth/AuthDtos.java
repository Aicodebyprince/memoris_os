package com.memoris.auth;

import com.memoris.organization.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public class AuthDtos {
    public record RegisterRequest(
            @NotBlank String fullName,
            @Email String email,
            @Size(min = 8) String password,
            @NotBlank String organizationName,
            String organizationSlug,
            Role requestedRole,
            String team
    ) {
    }

    public record LoginRequest(
            @Email String email,
            @NotBlank String password
    ) {
    }

    public record AuthResponse(
            String token,
            UserProfile user,
            OrganizationProfile organization
    ) {
    }

    public record UserProfile(
            UUID id,
            String fullName,
            String email,
            Role role,
            String team
    ) {
    }

    public record OrganizationProfile(
            UUID id,
            String name,
            String slug
    ) {
    }
}
