package com.memoris.knowledge;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class KnowledgeDtos {
    public record ProcessMeetingRequest(
            @NotBlank String title,
            @NotBlank String transcript,
            String projectName,
            String team
    ) {
    }

    public record DocumentRequest(
            @NotBlank String title,
            @NotBlank String sourceType,
            String summary,
            String projectName,
            String team
    ) {
    }

    public record DocumentUploadRequest(
            @NotBlank String filename,
            @NotBlank String contentBase64,
            String contentType,
            Long sizeBytes,
            String projectName,
            String team
    ) {
    }

    public record ProcessMeetingResponse(
            UUID meetingId,
            String summary,
            List<DecisionResponse> decisions,
            List<ActionItemResponse> actionItems,
            List<String> participants,
            List<String> topics,
            List<String> timeline
    ) {
    }

    public record DecisionResponse(
            UUID id,
            String title,
            String rationale,
            String status
    ) {
        static DecisionResponse from(Decision decision) {
            return new DecisionResponse(
                    decision.getId(),
                    decision.getTitle(),
                    decision.getRationale(),
                    decision.getStatus()
            );
        }
    }

    public record ActionItemResponse(
            UUID id,
            String title,
            String ownerName,
            String status,
            LocalDate dueDate
    ) {
        static ActionItemResponse from(ActionItem actionItem) {
            return new ActionItemResponse(
                    actionItem.getId(),
                    actionItem.getTitle(),
                    actionItem.getOwnerName(),
                    actionItem.getStatus(),
                    actionItem.getDueDate()
            );
        }
    }

    public record DocumentResponse(
            UUID id,
            String title,
            String sourceType,
            String summary
    ) {
        static DocumentResponse from(KnowledgeDocument document) {
            return new DocumentResponse(
                    document.getId(),
                    document.getTitle(),
                    document.getSourceType(),
                    document.getSummary()
            );
        }
    }
}
