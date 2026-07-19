package com.memoris.knowledge;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KnowledgeDocumentRepository extends JpaRepository<KnowledgeDocument, UUID> {
    List<KnowledgeDocument> findTop5ByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    long countByOrganizationId(UUID organizationId);

    @Query("""
            select d from KnowledgeDocument d
            where d.organization.id = :organizationId
            and (:team is null or d.team = :team)
            and (
                lower(d.title) like lower(concat('%', :query, '%'))
                or lower(d.summary) like lower(concat('%', :query, '%'))
            )
            order by d.createdAt desc
            """)
    List<KnowledgeDocument> search(@Param("organizationId") UUID organizationId, @Param("team") String team, @Param("query") String query);
}
