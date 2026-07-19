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
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("local")
public class DemoDataSeeder {
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
        return args -> {
            if (userRepository.existsByEmail("owner@memoris.dev")) {
                return;
            }

            Organization organization = organizationRepository.save(new Organization("Memoris Labs", "memoris-labs"));
            AppUser owner = userRepository.save(new AppUser("Prince Owner", "owner@memoris.dev", passwordEncoder.encode("password123")));
            AppUser admin = userRepository.save(new AppUser("Nora Admin", "admin@memoris.dev", passwordEncoder.encode("password123")));
            AppUser manager = userRepository.save(new AppUser("Asha Manager", "manager@memoris.dev", passwordEncoder.encode("password123")));
            AppUser employee = userRepository.save(new AppUser("Dev Employee", "employee@memoris.dev", passwordEncoder.encode("password123")));
            AppUser guest = userRepository.save(new AppUser("Guest Reviewer", "guest@memoris.dev", passwordEncoder.encode("password123")));

            memberRepository.save(new OrganizationMember(organization, owner, Role.OWNER, "Executive"));
            memberRepository.save(new OrganizationMember(organization, admin, Role.ADMIN, "Operations"));
            memberRepository.save(new OrganizationMember(organization, manager, Role.MANAGER, "Platform"));
            memberRepository.save(new OrganizationMember(organization, employee, Role.EMPLOYEE, "Platform"));
            memberRepository.save(new OrganizationMember(organization, guest, Role.GUEST, "Product"));

            Project project = projectRepository.save(new Project(organization, "Enterprise Memory MVP", "Platform"));
            Meeting meeting = meetingRepository.save(new Meeting(
                    organization,
                    project,
                    owner,
                    "Architecture Review",
                    "Prince and Asha reviewed PostgreSQL, RBAC, Timeline Intelligence, Enterprise Search, and CockroachDB as a future distributed SQL option.",
                    "Platform"
            ));
            meeting.enrich(
                    "The team aligned on PostgreSQL first, RBAC before AI retrieval, and CockroachDB as a future distributed SQL path.",
                    "Prince, Asha",
                    "PostgreSQL, RBAC, Timeline Intelligence, CockroachDB"
            );
            Decision decision = decisionRepository.save(new Decision(
                    organization,
                    meeting,
                    project,
                    "Start with PostgreSQL and prepare for pgvector",
                    "PostgreSQL proves strong relational design, enables full-text search, and can evolve into semantic search with pgvector.",
                    "Platform"
            ));
            actionItemRepository.save(new ActionItem(
                    organization,
                    meeting,
                    project,
                    "Publish ADR-001 for database direction",
                    "Asha Manager",
                    LocalDate.now().plusDays(4),
                    "Platform"
            ));
            documentRepository.save(new KnowledgeDocument(
                    organization,
                    project,
                    owner,
                    "Database Design",
                    "DOCX",
                    null,
                    "Explains PostgreSQL tables, tenant isolation, and the future pgvector extension.",
                    "Platform"
            ));

            timelineEventRepository.save(new TimelineEvent(organization, owner, project, TimelineEventType.MEETING_CREATED, "Meeting created", "Architecture Review", "Meeting", meeting.getId(), "Platform"));
            timelineEventRepository.save(new TimelineEvent(organization, owner, project, TimelineEventType.AI_SUMMARY_GENERATED, "AI summary generated", meeting.getSummary(), "Meeting", meeting.getId(), "Platform"));
            timelineEventRepository.save(new TimelineEvent(organization, owner, project, TimelineEventType.DECISION_ADDED, "Decision added", decision.getTitle(), "Decision", decision.getId(), "Platform"));
        };
    }
}
