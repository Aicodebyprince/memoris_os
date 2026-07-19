package com.memoris.knowledge;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DecisionRepository extends JpaRepository<Decision, UUID> {
    List<Decision> findTop5ByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    long countByOrganizationId(UUID organizationId);

    @Query("""
            select d from Decision d
            left join fetch d.meeting
            where d.organization.id = :organizationId
            and (:team is null or d.team = :team)
            and (
                lower(d.title) like lower(concat('%', :query, '%'))
                or lower(d.rationale) like lower(concat('%', :query, '%'))
            )
            order by d.createdAt desc
            """)
    List<Decision> search(@Param("organizationId") UUID organizationId, @Param("team") String team, @Param("query") String query);
}
