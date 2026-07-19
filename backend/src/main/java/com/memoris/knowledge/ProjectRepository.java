package com.memoris.knowledge;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    Optional<Project> findByOrganizationIdAndNameIgnoreCase(UUID organizationId, String name);
}
