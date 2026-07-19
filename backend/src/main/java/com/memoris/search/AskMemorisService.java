package com.memoris.search;

import com.memoris.ai.EvidenceContext;
import com.memoris.ai.MemorisAiService;
import com.memoris.common.CurrentUser;
import com.memoris.knowledge.Decision;
import com.memoris.knowledge.DecisionRepository;
import com.memoris.knowledge.Meeting;
import com.memoris.knowledge.MeetingRepository;
import com.memoris.organization.OrganizationRepository;
import com.memoris.organization.Role;
import com.memoris.search.AskMemorisController.AskResponse;
import com.memoris.search.AskMemorisController.Evidence;
import com.memoris.timeline.TimelineEvent;
import com.memoris.timeline.TimelineEventRepository;
import com.memoris.timeline.TimelineEventType;
import com.memoris.user.AppUserRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AskMemorisService {
    private final MeetingRepository meetingRepository;
    private final DecisionRepository decisionRepository;
    private final TimelineEventRepository timelineEventRepository;
    private final OrganizationRepository organizationRepository;
    private final AppUserRepository userRepository;
    private final MemorisAiService aiService;

    public AskMemorisService(
            MeetingRepository meetingRepository,
            DecisionRepository decisionRepository,
            TimelineEventRepository timelineEventRepository,
            OrganizationRepository organizationRepository,
            AppUserRepository userRepository,
            MemorisAiService aiService
    ) {
        this.meetingRepository = meetingRepository;
        this.decisionRepository = decisionRepository;
        this.timelineEventRepository = timelineEventRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.aiService = aiService;
    }

    @Transactional
    public AskResponse ask(CurrentUser currentUser, String question) {
        String lower = question.toLowerCase();
        if ((lower.contains("salary") || lower.contains("compensation") || lower.contains("hr")) && currentUser.role() != Role.OWNER && currentUser.role() != Role.ADMIN) {
            return new AskResponse("You do not have permission to access this information.", false, List.of());
        }

        String teamScope = currentUser.role() == Role.OWNER || currentUser.role() == Role.ADMIN ? null : currentUser.team();
        List<Evidence> evidence = new ArrayList<>();
        List<EvidenceContext> authorizedContext = new ArrayList<>();
        List<Decision> decisions = decisionRepository.search(currentUser.organizationId(), teamScope, keyword(lower));
        decisions.stream().limit(3).forEach(decision -> {
            Evidence item = new Evidence("Decision", decision.getId(), decision.getTitle(), decision.getRationale());
            evidence.add(item);
            authorizedContext.add(new EvidenceContext(item.type(), item.id(), item.title(), item.excerpt()));
        });
        List<Meeting> meetings = meetingRepository.search(currentUser.organizationId(), teamScope, keyword(lower));
        meetings.stream().limit(2).forEach(meeting -> {
            Evidence item = new Evidence("Meeting", meeting.getId(), meeting.getTitle(), meeting.getSummary());
            evidence.add(item);
            authorizedContext.add(new EvidenceContext(item.type(), item.id(), item.title(), item.excerpt()));
        });

        String answer = aiService.answerQuestion(question, authorizedContext);

        timelineEventRepository.save(new TimelineEvent(
                organizationRepository.getReferenceById(currentUser.organizationId()),
                userRepository.getReferenceById(currentUser.userId()),
                null,
                TimelineEventType.AI_ANSWER_GENERATED,
                "Ask Memoris answered",
                question,
                "AskMemoris",
                null,
                currentUser.team()
        ));

        return new AskResponse(answer, true, evidence);
    }

    private String keyword(String question) {
        if (question.contains("cockroachdb")) return "CockroachDB";
        if (question.contains("postgres")) return "PostgreSQL";
        if (question.contains("timeline")) return "Timeline";
        if (question.contains("search")) return "Search";
        return question.split("\\s+")[0];
    }
}
