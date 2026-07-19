package com.memoris.knowledge;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    List<Meeting> findTop5ByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    long countByOrganizationId(UUID organizationId);
    boolean existsByOrganizationIdAndTitleIgnoreCase(UUID organizationId, String title);

    @Query("""
            select m from Meeting m
            left join fetch m.project
            where m.organization.id = :organizationId
            and (:team is null or m.team = :team)
            and (
                lower(m.title) like lower(concat('%', :query, '%'))
                or lower(m.transcript) like lower(concat('%', :query, '%'))
                or lower(m.summary) like lower(concat('%', :query, '%'))
            )
            order by m.createdAt desc
            """)
    List<Meeting> search(@Param("organizationId") UUID organizationId, @Param("team") String team, @Param("query") String query);
}
