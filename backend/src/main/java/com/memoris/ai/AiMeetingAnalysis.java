package com.memoris.ai;

import java.util.List;

public record AiMeetingAnalysis(
        String summary,
        List<String> participants,
        List<String> topics,
        List<AiDecisionSuggestion> decisions,
        List<AiActionSuggestion> actionItems
) {
}
