package com.memoris.search;

import com.memoris.common.CurrentUser;
import com.memoris.knowledge.DecisionRepository;
import com.memoris.knowledge.KnowledgeDocumentRepository;
import com.memoris.knowledge.MeetingRepository;
import com.memoris.organization.OrganizationRepository;
import com.memoris.timeline.TimelineEvent;
import com.memoris.timeline.TimelineEventRepository;
import com.memoris.timeline.TimelineEventType;
import com.memoris.user.AppUserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {
    private final MeetingRepository meetingRepository;
    private final KnowledgeDocumentRepository documentRepository;
    private final DecisionRepository decisionRepository;
    private final TimelineEventRepository timelineEventRepository;
    private final OrganizationRepository organizationRepository;
    private final AppUserRepository userRepository;

    public SearchController(
            MeetingRepository meetingRepository,
            KnowledgeDocumentRepository documentRepository,
            DecisionRepository decisionRepository,
            TimelineEventRepository timelineEventRepository,
            OrganizationRepository organizationRepository,
            AppUserRepository userRepository
    ) {
        this.meetingRepository = meetingRepository;
        this.documentRepository = documentRepository;
        this.decisionRepository = decisionRepository;
        this.timelineEventRepository = timelineEventRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional
    SearchResponse search(@AuthenticationPrincipal CurrentUser currentUser, @RequestParam String q) {
        String teamScope = currentUser.role().name().equals("OWNER") || currentUser.role().name().equals("ADMIN")
                ? null
                : currentUser.team();
        List<SearchResult> results = new ArrayList<>();
        meetingRepository.search(currentUser.organizationId(), teamScope, q).forEach(meeting ->
                results.add(new SearchResult("Meeting", meeting.getId(), meeting.getTitle(), meeting.getSummary(), meeting.getTeam(), 0.94)));
        decisionRepository.search(currentUser.organizationId(), teamScope, q).forEach(decision ->
                results.add(new SearchResult("Decision", decision.getId(), decision.getTitle(), decision.getRationale(), decision.getTeam(), 0.89)));
        documentRepository.search(currentUser.organizationId(), teamScope, q).forEach(document ->
                results.add(new SearchResult("Document", document.getId(), document.getTitle(), document.getSummary(), document.getTeam(), 0.82)));
        timelineEventRepository.visibleForOrg(currentUser.organizationId(), teamScope).stream()
                .filter(event -> event.getTitle().toLowerCase().contains(q.toLowerCase()) || event.getDescription().toLowerCase().contains(q.toLowerCase()))
                .forEach(event -> results.add(new SearchResult("Timeline", event.getId(), event.getTitle(), event.getDescription(), event.getTeam(), 0.78)));

        timelineEventRepository.save(new TimelineEvent(
                organizationRepository.getReferenceById(currentUser.organizationId()),
                userRepository.getReferenceById(currentUser.userId()),
                null,
                TimelineEventType.SEARCH_PERFORMED,
                "Search performed",
                q,
                "Search",
                null,
                currentUser.team()
        ));

        return new SearchResponse(
                q,
                results.stream()
                        .sorted(Comparator.comparingDouble(SearchResult::score).reversed())
                        .limit(12)
                        .toList()
        );
    }

    record SearchResponse(String query, List<SearchResult> results) {
    }

    public record SearchResult(
            String type,
            UUID id,
            String title,
            String snippet,
            String team,
            double score
    ) {
    }
}
