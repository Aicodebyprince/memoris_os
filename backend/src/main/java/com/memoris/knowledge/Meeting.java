package com.memoris.knowledge;

import com.memoris.common.BaseEntity;
import com.memoris.organization.Organization;
import com.memoris.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "meetings")
public class Meeting extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String transcript;

    @Column(columnDefinition = "text")
    private String summary;

    @Column(nullable = false)
    private String team;

    @Column(columnDefinition = "text")
    private String participants;

    @Column(columnDefinition = "text")
    private String topics;

    protected Meeting() {
    }

    public Meeting(Organization organization, Project project, AppUser createdBy, String title, String transcript, String team) {
        this.organization = organization;
        this.project = project;
        this.createdBy = createdBy;
        this.title = title;
        this.transcript = transcript;
        this.team = team;
    }

    public void enrich(String summary, String participants, String topics) {
        this.summary = summary;
        this.participants = participants;
        this.topics = topics;
    }

    public String getTitle() {
        return title;
    }

    public String getTranscript() {
        return transcript;
    }

    public String getSummary() {
        return summary;
    }

    public String getTeam() {
        return team;
    }

    public String getParticipants() {
        return participants;
    }

    public String getTopics() {
        return topics;
    }

    public Project getProject() {
        return project;
    }
}
