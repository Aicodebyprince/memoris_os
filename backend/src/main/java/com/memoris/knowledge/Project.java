package com.memoris.knowledge;

import com.memoris.common.BaseEntity;
import com.memoris.organization.Organization;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "projects")
public class Project extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String team;

    protected Project() {
    }

    public Project(Organization organization, String name, String team) {
        this.organization = organization;
        this.name = name;
        this.team = team;
    }

    public String getName() {
        return name;
    }

    public String getTeam() {
        return team;
    }

    public Organization getOrganization() {
        return organization;
    }
}
