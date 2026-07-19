package com.memoris.seed;

import com.memoris.knowledge.ActionItem;
import com.memoris.knowledge.ActionItemRepository;
import com.memoris.knowledge.Decision;
import com.memoris.knowledge.DecisionRepository;
import com.memoris.knowledge.KnowledgeDocument;
import com.memoris.knowledge.KnowledgeDocumentRepository;
import com.memoris.knowledge.Meeting;
import com.memoris.knowledge.MeetingRepository;
import com.memoris.knowledge.Project;
import com.memoris.knowledge.ProjectRepository;
import com.memoris.organization.Organization;
import com.memoris.organization.OrganizationMember;
import com.memoris.organization.OrganizationMemberRepository;
import com.memoris.organization.OrganizationRepository;
import com.memoris.organization.Role;
import com.memoris.timeline.TimelineEvent;
import com.memoris.timeline.TimelineEventRepository;
import com.memoris.timeline.TimelineEventType;
import com.memoris.user.AppUser;
import com.memoris.user.AppUserRepository;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@ConditionalOnProperty(prefix = "app.demo", name = "seed-enabled", havingValue = "true")
public class DemoDataSeeder {
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    @Bean
    CommandLineRunner seedMemorisDemo(
            AppUserRepository userRepository,
            OrganizationRepository organizationRepository,
            OrganizationMemberRepository memberRepository,
            ProjectRepository projectRepository,
            MeetingRepository meetingRepository,
            DecisionRepository decisionRepository,
            ActionItemRepository actionItemRepository,
            KnowledgeDocumentRepository documentRepository,
            TimelineEventRepository timelineEventRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> demoOrganizations().forEach(demo -> seedOrganization(
                demo,
                userRepository,
                organizationRepository,
                memberRepository,
                projectRepository,
                meetingRepository,
                decisionRepository,
                actionItemRepository,
                documentRepository,
                timelineEventRepository,
                passwordEncoder
        ));
    }

    private void seedOrganization(
            DemoOrganization demo,
            AppUserRepository userRepository,
            OrganizationRepository organizationRepository,
            OrganizationMemberRepository memberRepository,
            ProjectRepository projectRepository,
            MeetingRepository meetingRepository,
            DecisionRepository decisionRepository,
            ActionItemRepository actionItemRepository,
            KnowledgeDocumentRepository documentRepository,
            TimelineEventRepository timelineEventRepository,
            PasswordEncoder passwordEncoder
    ) {
        log.info("Ensuring demo organization {} exists", demo.slug());

        Organization organization = organizationRepository.findBySlug(demo.slug())
                .orElseGet(() -> organizationRepository.save(new Organization(demo.name(), demo.slug())));
        AppUser owner = null;
        for (DemoUser demoUser : demo.users()) {
            AppUser user = userRepository.findByEmail(demoUser.email())
                    .map(existing -> {
                        existing.updateDemoProfile(demoUser.fullName(), passwordEncoder.encode("password123"));
                        return userRepository.save(existing);
                    })
                    .orElseGet(() -> userRepository.save(new AppUser(
                            demoUser.fullName(),
                            demoUser.email(),
                            passwordEncoder.encode("password123")
                    )));
            if (!memberRepository.existsByOrganizationIdAndUserId(organization.getId(), user.getId())) {
                memberRepository.save(new OrganizationMember(organization, user, demoUser.role(), demoUser.team()));
            }
            if (demoUser.role() == Role.OWNER) {
                owner = user;
            }
        }

        if (owner == null) {
            throw new IllegalStateException("Demo organization must include an owner: " + demo.slug());
        }

        Project project = projectRepository.findByOrganizationIdAndNameIgnoreCase(organization.getId(), demo.projectName())
                .orElseGet(() -> projectRepository.save(new Project(organization, demo.projectName(), demo.team())));
        if (meetingRepository.existsByOrganizationIdAndTitleIgnoreCase(organization.getId(), demo.meetingTitle())) {
            return;
        }

        Meeting meeting = meetingRepository.save(new Meeting(
                organization,
                project,
                owner,
                demo.meetingTitle(),
                demo.transcript(),
                demo.team()
        ));
        meeting.enrich(demo.summary(), demo.participants(), demo.topics());

        Decision decision = decisionRepository.save(new Decision(
                organization,
                meeting,
                project,
                demo.decisionTitle(),
                demo.decisionRationale(),
                demo.team()
        ));

        ActionItem actionItem = actionItemRepository.save(new ActionItem(
                organization,
                meeting,
                project,
                demo.actionTitle(),
                demo.actionOwner(),
                LocalDate.now().plusDays(4),
                demo.team()
        ));

        KnowledgeDocument document = documentRepository.save(new KnowledgeDocument(
                organization,
                project,
                owner,
                demo.documentTitle(),
                "DOCX",
                null,
                demo.documentSummary(),
                demo.team()
        ));

        timelineEventRepository.save(new TimelineEvent(organization, owner, project, TimelineEventType.MEETING_CREATED, "Meeting created", meeting.getTitle(), "Meeting", meeting.getId(), demo.team()));
        timelineEventRepository.save(new TimelineEvent(organization, owner, project, TimelineEventType.AI_SUMMARY_GENERATED, "AI summary generated", meeting.getSummary(), "Meeting", meeting.getId(), demo.team()));
        timelineEventRepository.save(new TimelineEvent(organization, owner, project, TimelineEventType.DECISION_ADDED, "Decision added", decision.getTitle(), "Decision", decision.getId(), demo.team()));
        timelineEventRepository.save(new TimelineEvent(organization, owner, project, TimelineEventType.ACTION_ITEM_ASSIGNED, "Action item assigned", actionItem.getTitle() + " -> " + actionItem.getOwnerName(), "ActionItem", actionItem.getId(), demo.team()));
        timelineEventRepository.save(new TimelineEvent(organization, owner, project, TimelineEventType.DOCUMENT_UPLOADED, "Document uploaded", document.getTitle(), "Document", document.getId(), demo.team()));
    }

    private List<DemoOrganization> demoOrganizations() {
        return List.of(
                new DemoOrganization(
                        "Memoris Labs",
                        "memoris-labs",
                        "Enterprise Memory MVP",
                        "Platform",
                        "Architecture Review",
                        "Prince and Asha reviewed PostgreSQL, RBAC, Timeline Intelligence, Enterprise Search, and CockroachDB as a future distributed SQL option.",
                        "The team aligned on PostgreSQL first, RBAC before AI retrieval, and CockroachDB as a future distributed SQL path.",
                        "Prince, Asha",
                        "PostgreSQL, RBAC, Timeline Intelligence, CockroachDB",
                        "Start with PostgreSQL and prepare for pgvector",
                        "PostgreSQL proves strong relational design, enables full-text search, and can evolve into semantic search with pgvector.",
                        "Database Design",
                        "Explains PostgreSQL tables, tenant isolation, and the future pgvector extension.",
                        "Publish ADR-001 for database direction",
                        "Asha Manager",
                        List.of(
                                new DemoUser(Role.OWNER, "Prince Owner", "owner@memoris.dev", "Executive"),
                                new DemoUser(Role.ADMIN, "Nora Admin", "admin@memoris.dev", "Operations"),
                                new DemoUser(Role.MANAGER, "Asha Manager", "manager@memoris.dev", "Platform"),
                                new DemoUser(Role.EMPLOYEE, "Dev Employee", "employee@memoris.dev", "Platform"),
                                new DemoUser(Role.GUEST, "Guest Reviewer", "guest@memoris.dev", "Product")
                        )
                ),
                new DemoOrganization(
                        "Helio Health",
                        "helio-health",
                        "Patient Ops Memory",
                        "Care Ops",
                        "Care Coordination Review",
                        "Maya and Arjun reviewed patient handoff quality, audit trails, RBAC restrictions, and a policy that protected health data must be filtered before AI context is assembled.",
                        "The care operations team aligned on strict permission filtering before AI retrieval and a timeline-first audit trail for patient handoffs.",
                        "Maya, Arjun",
                        "RBAC, Patient Handoffs, Audit Trail, AI Safety",
                        "Filter protected care data before AI retrieval",
                        "Care data should only enter AI prompts after tenant, role, and team authorization checks pass.",
                        "Care Handoff Protocol",
                        "Documents handoff review steps, evidence trails, and access boundaries for care operations.",
                        "Record RBAC demo for care team access",
                        "Maya Manager",
                        List.of(
                                new DemoUser(Role.OWNER, "Maya Owner", "owner@heliohealth.dev", "Executive"),
                                new DemoUser(Role.ADMIN, "Ira Admin", "admin@heliohealth.dev", "Operations"),
                                new DemoUser(Role.MANAGER, "Maya Manager", "manager@heliohealth.dev", "Care Ops"),
                                new DemoUser(Role.EMPLOYEE, "Arjun Employee", "employee@heliohealth.dev", "Care Ops"),
                                new DemoUser(Role.GUEST, "Care Guest", "guest@heliohealth.dev", "Quality")
                        )
                ),
                new DemoOrganization(
                        "FinPilot Capital",
                        "finpilot-capital",
                        "Risk Intelligence Hub",
                        "Risk",
                        "Risk Controls Review",
                        "Nikhil and Sara reviewed quarterly risk controls, approval evidence, financial document access, and a decision to keep executive compensation discussions restricted to owner and admin roles.",
                        "The risk team aligned on evidence-backed decisions, finance document access controls, and restricted handling for sensitive executive compensation records.",
                        "Nikhil, Sara",
                        "Risk Controls, Evidence, Finance RBAC, Executive Compensation",
                        "Require evidence cards for risk decisions",
                        "Risk decisions need traceable meeting, document, and timeline evidence before leadership review.",
                        "Quarterly Risk Controls",
                        "Summarizes control evidence, ownership, and permission boundaries for finance data.",
                        "Prepare risk evidence viewer walkthrough",
                        "Sara Manager",
                        List.of(
                                new DemoUser(Role.OWNER, "Nikhil Owner", "owner@finpilot.dev", "Executive"),
                                new DemoUser(Role.ADMIN, "Rhea Admin", "admin@finpilot.dev", "Operations"),
                                new DemoUser(Role.MANAGER, "Sara Manager", "manager@finpilot.dev", "Risk"),
                                new DemoUser(Role.EMPLOYEE, "Analyst Employee", "employee@finpilot.dev", "Risk"),
                                new DemoUser(Role.GUEST, "Audit Guest", "guest@finpilot.dev", "Audit")
                        )
                )
        );
    }

    private record DemoOrganization(
            String name,
            String slug,
            String projectName,
            String team,
            String meetingTitle,
            String transcript,
            String summary,
            String participants,
            String topics,
            String decisionTitle,
            String decisionRationale,
            String documentTitle,
            String documentSummary,
            String actionTitle,
            String actionOwner,
            List<DemoUser> users
    ) {
    }

    private record DemoUser(Role role, String fullName, String email, String team) {
    }
}
