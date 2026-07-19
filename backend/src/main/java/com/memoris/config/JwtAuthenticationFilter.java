package com.memoris.config;

import com.memoris.auth.JwtService;
import com.memoris.common.CurrentUser;
import com.memoris.organization.OrganizationMember;
import com.memoris.organization.OrganizationMemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final OrganizationMemberRepository memberRepository;

    public JwtAuthenticationFilter(JwtService jwtService, OrganizationMemberRepository memberRepository) {
        this.jwtService = jwtService;
        this.memberRepository = memberRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String email = jwtService.subject(header.substring(7));
            OrganizationMember member = memberRepository.findByUserEmail(email).orElseThrow();
            CurrentUser currentUser = new CurrentUser(
                    member.getUser().getId(),
                    member.getOrganization().getId(),
                    member.getRole(),
                    member.getTeam(),
                    member.getUser().getEmail()
            );
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    currentUser,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + member.getRole().name()))
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (RuntimeException ignored) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
