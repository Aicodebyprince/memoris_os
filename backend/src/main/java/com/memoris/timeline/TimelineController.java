package com.memoris.timeline;

import com.memoris.common.CurrentUser;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/timeline")
public class TimelineController {
    private final TimelineEventRepository timelineEventRepository;

    public TimelineController(TimelineEventRepository timelineEventRepository) {
        this.timelineEventRepository = timelineEventRepository;
    }

    @GetMapping
    List<TimelineEventResponse> timeline(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestParam(required = false) TimelineEventType eventType
    ) {
        String teamScope = currentUser.role().name().equals("OWNER") || currentUser.role().name().equals("ADMIN")
                ? null
                : currentUser.team();
        return timelineEventRepository.visibleForOrg(currentUser.organizationId(), teamScope)
                .stream()
                .filter(event -> eventType == null || event.getEventType() == eventType)
                .map(TimelineEventResponse::from)
                .toList();
    }

    record TimelineEventResponse(
            UUID id,
            TimelineEventType eventType,
            String title,
            String description,
            String entityType,
            UUID entityId,
            String project,
            String team,
            OffsetDateTime occurredAt
    ) {
        static TimelineEventResponse from(TimelineEvent event) {
            return new TimelineEventResponse(
                    event.getId(),
                    event.getEventType(),
                    event.getTitle(),
                    event.getDescription(),
                    event.getEntityType(),
                    event.getEntityId(),
                    event.getProject() == null ? null : event.getProject().getName(),
                    event.getTeam(),
                    event.getOccurredAt()
            );
        }
    }
}
