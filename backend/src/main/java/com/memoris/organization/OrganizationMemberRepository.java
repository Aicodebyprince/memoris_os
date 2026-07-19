package com.memoris.organization;

import com.memoris.user.AppUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {
    Optional<OrganizationMember> findFirstByUserOrderByCreatedAtAsc(AppUser user);
    boolean existsByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    @Query("""
            select m from OrganizationMember m
            join fetch m.user
            join fetch m.organization
            where lower(m.user.email) = lower(:email)
            """)
    Optional<OrganizationMember> findByUserEmail(@Param("email") String email);
}
