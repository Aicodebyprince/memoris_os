package com.memoris.knowledge;

import com.memoris.ai.AiActionSuggestion;
import com.memoris.ai.AiDecisionSuggestion;
import com.memoris.ai.AiMeetingAnalysis;
import com.memoris.ai.MemorisAiService;
import com.memoris.common.CurrentUser;
import com.memoris.knowledge.KnowledgeDtos.ActionItemResponse;
import com.memoris.knowledge.KnowledgeDtos.DecisionResponse;
import com.memoris.knowledge.KnowledgeDtos.DocumentRequest;
import com.memoris.knowledge.KnowledgeDtos.DocumentResponse;
import com.memoris.knowledge.KnowledgeDtos.ProcessMeetingRequest;
import com.memoris.knowledge.KnowledgeDtos.ProcessMeetingResponse;
import com.memoris.organization.Organization;
import com.memoris.organization.OrganizationRepository;
import com.memoris.organization.Role;
import com.memoris.timeline.TimelineEvent;
import com.memoris.timeline.TimelineEventRepository;
import com.memoris.timeline.TimelineEventType;
import com.memoris.user.AppUser;
import com.memoris.user.AppUserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class KnowledgeService {
    private final OrganizationRepository organizationRepository;
    private final AppUserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final MeetingRepository meetingRepository;
    private final KnowledgeDocumentRepository documentRepository;
    private final DecisionRepository decisionRepository;
    private final ActionItemRepository actionItemRepository;
    private final TimelineEventRepository timelineEventRepository;
    private final MemorisAiService aiService;

    public KnowledgeService(
            OrganizationRepository organizationRepository,
            AppUserRepository userRepository,
            ProjectRepository projectRepository,
            MeetingRepository meetingRepository,
            KnowledgeDocumentRepository documentRepository,
            DecisionRepository decisionRepository,
            ActionItemRepository actionItemRepository,
            TimelineEventRepository timelineEventRepository,
            MemorisAiService aiService
    ) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.meetingRepository = meetingRepository;
        this.documentRepository = documentRepository;
        this.decisionRepository = decisionRepository;
        this.actionItemRepository = actionItemRepository;
        this.timelineEventRepository = timelineEventRepository;
        this.aiService = aiService;
    }

    @Transactional
    public ProcessMeetingResponse processMeeting(CurrentUser currentUser, ProcessMeetingRequest request) {
        if (currentUser.role() == Role.GUEST) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Guests cannot upload knowledge");
        }

        String team = requestedTeam(currentUser, request.team());
        Organization organization = organizationRepository.getReferenceById(currentUser.organizationId());
        AppUser actor = userRepository.getReferenceById(currentUser.userId());
        Project project = resolveProject(organization, request.projectName(), team);

        Meeting meeting = meetingRepository.save(new Meeting(
                organization,
                project,
                actor,
                request.title(),
                request.transcript(),
                team
        ));
        timeline(organization, actor, project, TimelineEventType.MEETING_CREATED, "Meeting created", request.title(), "Meeting", meeting.getId(), team);

        AiMeetingAnalysis analysis = aiService.analyzeMeeting(request.transcript());
        List<String> participants = analysis.participants();
        List<String> topics = analysis.topics();
        String summary = analysis.summary();
        meeting.enrich(summary, String.join(", ", participants), String.join(", ", topics));
        timeline(organization, actor, project, TimelineEventType.AI_SUMMARY_GENERATED, "AI summary generated", summary, "Meeting", meeting.getId(), team);

        List<Decision> decisions = saveDecisions(organization, meeting, project, analysis.decisions(), team, actor);
        List<ActionItem> actionItems = saveActionItems(organization, meeting, project, analysis.actionItems(), team, actor);

        return new ProcessMeetingResponse(
                meeting.getId(),
                summary,
                decisions.stream().map(DecisionResponse::from).toList(),
                actionItems.stream().map(ActionItemResponse::from).toList(),
                participants,
                topics,
                List.of("Meeting Created", "AI Summary Generated", "Decision Added", "Action Items Assigned")
        );
    }

    @Transactional
    public DocumentResponse createDocument(CurrentUser currentUser, DocumentRequest request) {
        if (currentUser.role() == Role.GUEST) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Guests cannot upload documents");
        }

        String team = requestedTeam(currentUser, request.team());
        Organization organization = organizationRepository.getReferenceById(currentUser.organizationId());
        AppUser actor = userRepository.getReferenceById(currentUser.userId());
        Project project = resolveProject(organization, request.projectName(), team);
        KnowledgeDocument document = documentRepository.save(new KnowledgeDocument(
                organization,
                project,
                actor,
                request.title(),
                request.sourceType(),
                null,
                request.summary() == null || request.summary().isBlank() ? "Document captured for organizational memory." : request.summary(),
                team
        ));
        timeline(organization, actor, project, TimelineEventType.DOCUMENT_UPLOADED, "Document uploaded", document.getTitle(), "Document", document.getId(), team);
        return DocumentResponse.from(document);
    }

    private Project resolveProject(Organization organization, String projectName, String team) {
        String name = projectName == null || projectName.isBlank() ? "Enterprise Memory MVP" : projectName.trim();
        return projectRepository.findByOrganizationIdAndNameIgnoreCase(organization.getId(), name)
                .orElseGet(() -> projectRepository.save(new Project(organization, name, team)));
    }

    private String requestedTeam(CurrentUser currentUser, String requestedTeam) {
        String team = requestedTeam == null || requestedTeam.isBlank() ? currentUser.team() : requestedTeam.trim();
        if (!currentUser.canReadTeam(team)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this team");
        }
        return team;
    }

    private List<Decision> saveDecisions(
            Organization organization,
            Meeting meeting,
            Project project,
            List<AiDecisionSuggestion> suggestions,
            String team,
            AppUser actor
    ) {
        return suggestions.stream().map(suggestion -> {
            Decision decision = decisionRepository.save(new Decision(
                    organization,
                    meeting,
                    project,
                    blankToDefault(suggestion.title(), "Proceed with the agreed implementation direction"),
                    blankToDefault(suggestion.rationale(), "Captured from meeting transcript and linked to evidence in the organization timeline."),
                    team
            ));
            timeline(organization, actor, project, TimelineEventType.DECISION_ADDED, "Decision added", decision.getTitle(), "Decision", decision.getId(), team);
            return decision;
        }).toList();
    }

    private List<ActionItem> saveActionItems(
            Organization organization,
            Meeting meeting,
            Project project,
            List<AiActionSuggestion> suggestions,
            String team,
            AppUser actor
    ) {
        List<ActionItem> items = suggestions.stream()
                .map(suggestion -> actionItemRepository.save(new ActionItem(
                        organization,
                        meeting,
                        project,
                        blankToDefault(suggestion.title(), "Review implementation risks"),
                        blankToDefault(suggestion.ownerName(), "Engineering Manager"),
                        suggestion.dueDate(),
                        team
                )))
                .toList();
        items.forEach(item -> timeline(
                organization,
                actor,
                project,
                TimelineEventType.ACTION_ITEM_ASSIGNED,
                "Action item assigned",
                item.getTitle() + " -> " + item.getOwnerName(),
                "ActionItem",
                item.getId(),
                team
        ));
        return items;
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private void timeline(
            Organization organization,
            AppUser actor,
            Project project,
            TimelineEventType type,
            String title,
            String description,
            String entityType,
            java.util.UUID entityId,
            String team
    ) {
        timelineEventRepository.save(new TimelineEvent(
                organization,
                actor,
                project,
                type,
                title,
                description,
                entityType,
                entityId,
                team
        ));
    }
}
