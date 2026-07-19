package com.memoris.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final String issuer;
    private final byte[] secret;
    private final long expiresMinutes;

    public JwtService(
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expires-minutes}") long expiresMinutes
    ) {
        this.issuer = issuer;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.expiresMinutes = expiresMinutes;
    }

    public String issue(String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(issuer)
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expiresMinutes * 60)))
                .signWith(Keys.hmacShaKeyFor(secret), Jwts.SIG.HS256)
                .compact();
    }

    public String subject(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(secret))
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }
}
