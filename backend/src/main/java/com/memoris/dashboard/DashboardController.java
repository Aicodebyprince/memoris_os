package com.memoris.dashboard;

import com.memoris.common.CurrentUser;
import com.memoris.knowledge.ActionItem;
import com.memoris.knowledge.ActionItemRepository;
import com.memoris.knowledge.Decision;
import com.memoris.knowledge.DecisionRepository;
import com.memoris.knowledge.KnowledgeDocument;
import com.memoris.knowledge.KnowledgeDocumentRepository;
import com.memoris.knowledge.Meeting;
import com.memoris.knowledge.MeetingRepository;
import com.memoris.timeline.TimelineEventRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final MeetingRepository meetingRepository;
    private final KnowledgeDocumentRepository documentRepository;
    private final DecisionRepository decisionRepository;
    private final ActionItemRepository actionItemRepository;
    private final TimelineEventRepository timelineEventRepository;

    public DashboardController(
            MeetingRepository meetingRepository,
            KnowledgeDocumentRepository documentRepository,
            DecisionRepository decisionRepository,
            ActionItemRepository actionItemRepository,
            TimelineEventRepository timelineEventRepository
    ) {
        this.meetingRepository = meetingRepository;
        this.documentRepository = documentRepository;
        this.decisionRepository = decisionRepository;
        this.actionItemRepository = actionItemRepository;
        this.timelineEventRepository = timelineEventRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    DashboardResponse dashboard(@AuthenticationPrincipal CurrentUser currentUser) {
        List<MeetingCard> meetings = meetingRepository.findTop5ByOrganizationIdOrderByCreatedAtDesc(currentUser.organizationId())
                .stream()
                .filter(meeting -> currentUser.canReadTeam(meeting.getTeam()))
                .map(MeetingCard::from)
                .toList();
        List<DecisionCard> decisions = decisionRepository.findTop5ByOrganizationIdOrderByCreatedAtDesc(currentUser.organizationId())
                .stream()
                .filter(decision -> currentUser.canReadTeam(decision.getTeam()))
                .map(DecisionCard::from)
                .toList();
        List<DocumentCard> documents = documentRepository.findTop5ByOrganizationIdOrderByCreatedAtDesc(currentUser.organizationId())
                .stream()
                .filter(document -> currentUser.canReadTeam(document.getTeam()))
                .map(DocumentCard::from)
                .toList();
        List<ActionItemCard> actionItems = actionItemRepository.findTop8ByOrganizationIdOrderByCreatedAtDesc(currentUser.organizationId())
                .stream()
                .filter(item -> currentUser.canReadTeam(item.getTeam()))
                .map(ActionItemCard::from)
                .toList();

        Metrics metrics = new Metrics(
                meetingRepository.countByOrganizationId(currentUser.organizationId()),
                decisionRepository.countByOrganizationId(currentUser.organizationId()),
                documentRepository.countByOrganizationId(currentUser.organizationId()),
                actionItemRepository.countByOrganizationId(currentUser.organizationId()),
                timelineEventRepository.countByOrganizationId(currentUser.organizationId())
        );
        return new DashboardResponse(metrics, meetings, decisions, documents, actionItems);
    }

    record DashboardResponse(
            Metrics metrics,
            List<MeetingCard> recentMeetings,
            List<DecisionCard> recentDecisions,
            List<DocumentCard> recentDocuments,
            List<ActionItemCard> pendingActionItems
    ) {
    }

    record Metrics(long meetings, long decisions, long documents, long actionItems, long timelineEvents) {
    }

    record MeetingCard(UUID id, String title, String summary, String team) {
        static MeetingCard from(Meeting meeting) {
            return new MeetingCard(meeting.getId(), meeting.getTitle(), meeting.getSummary(), meeting.getTeam());
        }
    }

    record DecisionCard(UUID id, String title, String rationale, String status, String team) {
        static DecisionCard from(Decision decision) {
            return new DecisionCard(decision.getId(), decision.getTitle(), decision.getRationale(), decision.getStatus(), decision.getTeam());
        }
    }

    record DocumentCard(UUID id, String title, String sourceType, String summary, String team) {
        static DocumentCard from(KnowledgeDocument document) {
            return new DocumentCard(document.getId(), document.getTitle(), document.getSourceType(), document.getSummary(), document.getTeam());
        }
    }

    record ActionItemCard(UUID id, String title, String ownerName, String status, LocalDate dueDate, String team) {
        static ActionItemCard from(ActionItem actionItem) {
            return new ActionItemCard(actionItem.getId(), actionItem.getTitle(), actionItem.getOwnerName(), actionItem.getStatus(), actionItem.getDueDate(), actionItem.getTeam());
        }
    }
}
