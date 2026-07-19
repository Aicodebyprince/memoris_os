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
@Table(name = "decisions")
public class Decision extends BaseEntity {
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

    @Column(nullable = false, columnDefinition = "text")
    private String rationale;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String team;

    protected Decision() {
    }

    public Decision(Organization organization, Meeting meeting, Project project, String title, String rationale, String team) {
        this.organization = organization;
        this.meeting = meeting;
        this.project = project;
        this.title = title;
        this.rationale = rationale;
        this.status = "ACCEPTED";
        this.team = team;
    }

    public String getTitle() {
        return title;
    }

    public String getRationale() {
        return rationale;
    }

    public String getStatus() {
        return status;
    }

    public String getTeam() {
        return team;
    }

    public Meeting getMeeting() {
        return meeting;
    }
}
