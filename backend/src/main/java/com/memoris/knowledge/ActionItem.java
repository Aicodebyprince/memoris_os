package com.memoris.knowledge;

import com.memoris.common.BaseEntity;
import com.memoris.organization.Organization;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "action_items")
public class ActionItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id")
    private Meeting meeting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String ownerName;

    @Column(nullable = false)
    private String status;

    private LocalDate dueDate;

    @Column(nullable = false)
    private String team;

    protected ActionItem() {
    }

    public ActionItem(Organization organization, Meeting meeting, Project project, String title, String ownerName, LocalDate dueDate, String team) {
        this.organization = organization;
        this.meeting = meeting;
        this.project = project;
        this.title = title;
        this.ownerName = ownerName;
        this.status = "OPEN";
        this.dueDate = dueDate;
        this.team = team;
    }

    public String getTitle() {
        return title;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public String getStatus() {
        return status;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public String getTeam() {
        return team;
    }
}
