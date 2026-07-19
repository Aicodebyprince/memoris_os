package com.memoris.timeline;

import com.memoris.organization.Organization;
import com.memoris.knowledge.Project;
import com.memoris.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "timeline_events")
public class TimelineEvent {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private AppUser actor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TimelineEventType eventType;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private String entityType;

    private UUID entityId;

    @Column(nullable = false)
    private String team;

    @Column(nullable = false)
    private OffsetDateTime occurredAt;

    protected TimelineEvent() {
    }

    public TimelineEvent(
            Organization organization,
            AppUser actor,
            Project project,
            TimelineEventType eventType,
            String title,
            String description,
            String entityType,
            UUID entityId,
            String team
    ) {
        this.organization = organization;
        this.actor = actor;
        this.project = project;
        this.eventType = eventType;
        this.title = title;
        this.description = description;
        this.entityType = entityType;
        this.entityId = entityId;
        this.team = team;
    }

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (occurredAt == null) {
            occurredAt = OffsetDateTime.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public TimelineEventType getEventType() {
        return eventType;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getEntityType() {
        return entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public String getTeam() {
        return team;
    }

    public OffsetDateTime getOccurredAt() {
        return occurredAt;
    }

    public Project getProject() {
        return project;
    }
}
