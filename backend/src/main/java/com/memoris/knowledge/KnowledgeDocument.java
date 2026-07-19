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
@Table(name = "documents")
public class KnowledgeDocument extends BaseEntity {
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

    @Column(nullable = false)
    private String sourceType;

    private String storageKey;

    @Column(columnDefinition = "text")
    private String summary;

    @Column(nullable = false)
    private String team;

    protected KnowledgeDocument() {
    }

    public KnowledgeDocument(
            Organization organization,
            Project project,
            AppUser createdBy,
            String title,
            String sourceType,
            String storageKey,
            String summary,
            String team
    ) {
        this.organization = organization;
        this.project = project;
        this.createdBy = createdBy;
        this.title = title;
        this.sourceType = sourceType;
        this.storageKey = storageKey;
        this.summary = summary;
        this.team = team;
    }

    public String getTitle() {
        return title;
    }

    public String getSourceType() {
        return sourceType;
    }

    public String getSummary() {
        return summary;
    }

    public String getTeam() {
        return team;
    }
}
