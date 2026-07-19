package com.memoris.timeline;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TimelineEventRepository extends JpaRepository<TimelineEvent, UUID> {
    @Query("""
            select e from TimelineEvent e
            left join fetch e.project
            where e.organization.id = :organizationId
            and (:team is null or e.team = :team)
            order by e.occurredAt desc
            """)
    List<TimelineEvent> visibleForOrg(@Param("organizationId") UUID organizationId, @Param("team") String team);

    long countByOrganizationId(UUID organizationId);
}
