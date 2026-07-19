package com.memoris.organization;

import com.memoris.common.BaseEntity;
import com.memoris.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "organization_members")
public class OrganizationMember extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String team;

    protected OrganizationMember() {
    }

    public OrganizationMember(Organization organization, AppUser user, Role role, String team) {
        this.organization = organization;
        this.user = user;
        this.role = role;
        this.team = team;
    }

    public Organization getOrganization() {
        return organization;
    }

    public AppUser getUser() {
        return user;
    }

    public Role getRole() {
        return role;
    }

    public String getTeam() {
        return team;
    }
}
