package com.memoris.auth;

import com.memoris.auth.AuthDtos.AuthResponse;
import com.memoris.auth.AuthDtos.LoginRequest;
import com.memoris.auth.AuthDtos.OrganizationProfile;
import com.memoris.auth.AuthDtos.RegisterRequest;
import com.memoris.auth.AuthDtos.UserProfile;
import com.memoris.organization.Organization;
import com.memoris.organization.OrganizationMember;
import com.memoris.organization.OrganizationMemberRepository;
import com.memoris.organization.OrganizationRepository;
import com.memoris.organization.Role;
import com.memoris.user.AppUser;
import com.memoris.user.AppUserRepository;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final AppUserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            AppUserRepository userRepository,
            OrganizationRepository organizationRepository,
            OrganizationMemberRepository memberRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        AppUser user = userRepository.save(new AppUser(
                request.fullName(),
                email,
                passwordEncoder.encode(request.password())
        ));

        Organization organization = resolveOrganization(request);
        Role role = request.organizationSlug() == null || request.organizationSlug().isBlank()
                ? Role.OWNER
                : safeRole(request.requestedRole());
        OrganizationMember member = memberRepository.save(new OrganizationMember(
                organization,
                user,
                role,
                defaultTeam(request.team())
        ));

        return response(user, organization, member);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        AppUser user = userRepository.findByEmail(request.email().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        OrganizationMember member = memberRepository.findFirstByUserOrderByCreatedAtAsc(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not part of an organization"));
        return response(user, member.getOrganization(), member);
    }

    private Organization resolveOrganization(RegisterRequest request) {
        if (request.organizationSlug() != null && !request.organizationSlug().isBlank()) {
            return organizationRepository.findBySlug(request.organizationSlug())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        }

        String slug = slugify(request.organizationName());
        organizationRepository.findBySlug(slug).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Organization slug already exists");
        });
        return organizationRepository.save(new Organization(request.organizationName(), slug));
    }

    private AuthResponse response(AppUser user, Organization organization, OrganizationMember member) {
        return new AuthResponse(
                jwtService.issue(user.getEmail()),
                new UserProfile(user.getId(), user.getFullName(), user.getEmail(), member.getRole(), member.getTeam()),
                new OrganizationProfile(organization.getId(), organization.getName(), organization.getSlug())
        );
    }

    private Role safeRole(Role requestedRole) {
        if (requestedRole == Role.OWNER || requestedRole == Role.ADMIN) {
            return Role.EMPLOYEE;
        }
        return requestedRole == null ? Role.EMPLOYEE : requestedRole;
    }

    private String defaultTeam(String team) {
        return team == null || team.isBlank() ? "Platform" : team.trim();
    }

    private String slugify(String input) {
        return input.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}
