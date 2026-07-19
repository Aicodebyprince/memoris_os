package com.memoris.knowledge;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActionItemRepository extends JpaRepository<ActionItem, UUID> {
    List<ActionItem> findTop8ByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    long countByOrganizationId(UUID organizationId);
}
