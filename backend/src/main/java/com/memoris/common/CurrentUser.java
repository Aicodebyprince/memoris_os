package com.memoris.common;

import com.memoris.organization.Role;
import java.util.UUID;

public record CurrentUser(
        UUID userId,
        UUID organizationId,
        Role role,
        String team,
        String email
) {
    public boolean canReadTeam(String requestedTeam) {
        if (role == Role.OWNER || role == Role.ADMIN) {
            return true;
        }
        if (requestedTeam == null || team == null) {
            return false;
        }
        return team.equalsIgnoreCase(requestedTeam);
    }

    public boolean canManageKnowledge() {
        return role == Role.OWNER || role == Role.ADMIN || role == Role.MANAGER;
    }
}
