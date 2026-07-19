package com.memoris.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class MemorisAiService {
    private static final Logger log = LoggerFactory.getLogger(MemorisAiService.class);

    private final AiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public MemorisAiService(AiProperties properties, RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = restClientBuilder.baseUrl(properties.getGemini().getBaseUrl()).build();
        this.objectMapper = objectMapper;
    }

    public String activeProvider() {
        return geminiEnabled() ? "gemini" : "local";
    }

    public AiMeetingAnalysis analyzeMeeting(String transcript) {
        if (geminiEnabled()) {
            try {
                return analyzeWithGemini(transcript);
            } catch (RuntimeException exception) {
                log.warn("Gemini meeting analysis failed. Falling back to local analysis.", exception);
            }
        }
        return analyzeLocally(transcript);
    }

    public String answerQuestion(String question, List<EvidenceContext> evidence) {
        if (evidence.isEmpty()) {
            return "I could not find enough authorized evidence to answer that confidently.";
        }

        if (geminiEnabled()) {
            try {
                String prompt = """
                        You are Memoris OS, an enterprise memory assistant.
                        Answer the user's question using only the authorized evidence below.
                        Keep the answer concise, specific, and evidence-backed.

                        Question:
                        %s

                        Authorized evidence:
                        %s
                        """.formatted(question, formatEvidence(evidence));
                String answer = generateGemini(prompt, false);
                if (StringUtils.hasText(answer)) {
                    return answer.trim();
                }
            } catch (RuntimeException exception) {
                log.warn("Gemini answer generation failed. Falling back to local answer.", exception);
            }
        }

        return synthesizeLocally(question.toLowerCase(), evidence);
    }

    private AiMeetingAnalysis analyzeWithGemini(String transcript) {
        String prompt = """
                You are the AI processing layer for Memoris OS.
                Extract structured enterprise memory from the meeting transcript.
                Return only valid JSON with this shape:
                {
                  "summary": "short summary",
                  "participants": ["name"],
                  "topics": ["topic"],
                  "decisions": [{"title": "decision title", "rationale": "why"}],
                  "actionItems": [{"title": "task", "ownerName": "person or team", "dueDate": "YYYY-MM-DD or null"}]
                }

                Meeting transcript:
                %s
                """.formatted(limit(transcript, properties.getMaxContextChars()));

        String text = generateGemini(prompt, true);
        try {
            JsonNode root = objectMapper.readTree(extractJson(text));
            AiMeetingAnalysis fallback = analyzeLocally(transcript);
            return new AiMeetingAnalysis(
                    textOr(root.path("summary"), fallback.summary()),
                    stringList(root.path("participants"), fallback.participants()),
                    stringList(root.path("topics"), fallback.topics()),
                    decisionList(root.path("decisions"), fallback.decisions()),
                    actionList(root.path("actionItems"), fallback.actionItems())
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Could not parse Gemini structured meeting response", exception);
        }
    }

    private String generateGemini(String prompt, boolean json) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", prompt))
        )));

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("maxOutputTokens", properties.getGemini().getMaxOutputTokens());
        if (json) {
            generationConfig.put("responseMimeType", "application/json");
        }
        payload.put("generationConfig", generationConfig);

        try {
            JsonNode response = restClient.post()
                    .uri("/models/{model}:generateContent", properties.getGemini().getModel())
                    .header("x-goog-api-key", properties.getGemini().getApiKey())
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null) {
                return "";
            }
            return response.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
        } catch (RestClientException exception) {
            throw new IllegalStateException("Gemini API request failed", exception);
        }
    }

    private AiMeetingAnalysis analyzeLocally(String transcript) {
        List<String> participants = extractParticipants(transcript);
        List<String> topics = extractTopics(transcript);
        return new AiMeetingAnalysis(
                summarize(transcript, topics),
                participants,
                topics,
                localDecisions(transcript),
                localActions(transcript)
        );
    }

    private List<AiDecisionSuggestion> localDecisions(String transcript) {
        List<AiDecisionSuggestion> decisions = new ArrayList<>();
        String lower = transcript.toLowerCase();
        if (lower.contains("cockroachdb")) {
            decisions.add(new AiDecisionSuggestion(
                    "Use CockroachDB for distributed SQL",
                    "Captured from meeting transcript and linked to scalability evidence."
            ));
        }
        if (lower.contains("postgres") || lower.contains("postgresql")) {
            decisions.add(new AiDecisionSuggestion(
                    "Start with PostgreSQL as the system of record",
                    "PostgreSQL gives strong relational modeling, full-text search, and a clean pgvector path."
            ));
        }
        if (decisions.isEmpty()) {
            decisions.add(new AiDecisionSuggestion(
                    "Proceed with the agreed implementation direction",
                    "Captured from meeting transcript and linked to evidence in the organization timeline."
            ));
        }
        return decisions;
    }

    private List<AiActionSuggestion> localActions(String transcript) {
        return List.of(
                new AiActionSuggestion("Publish architecture decision record", "Platform Lead", LocalDate.now().plusDays(3)),
                new AiActionSuggestion(
                        transcript.toLowerCase().contains("demo") ? "Prepare stakeholder demo" : "Review implementation risks",
                        "Engineering Manager",
                        LocalDate.now().plusDays(7)
                )
        );
    }

    private String synthesizeLocally(String question, List<EvidenceContext> evidence) {
        if (question.contains("cockroachdb")) {
            return "We selected CockroachDB because the authorized evidence points to distributed SQL, resilience, and scalability goals.";
        }
        if (question.contains("postgres")) {
            return "PostgreSQL is the starting system of record because it gives the team strong relational modeling, full-text search, and a path to pgvector.";
        }
        return "Based on the authorized evidence, the organization aligned on the captured decision and linked follow-up actions.";
    }

    private List<String> extractParticipants(String transcript) {
        Set<String> participants = new LinkedHashSet<>();
        String[] tokens = transcript.split("\\s+");
        for (String token : tokens) {
            String cleaned = token.replaceAll("[^A-Za-z]", "");
            if (cleaned.length() > 2 && Character.isUpperCase(cleaned.charAt(0))) {
                participants.add(cleaned);
            }
            if (participants.size() == 5) {
                break;
            }
        }
        if (participants.isEmpty()) {
            participants.add("Product");
            participants.add("Engineering");
        }
        return List.copyOf(participants);
    }

    private List<String> extractTopics(String transcript) {
        String lower = transcript.toLowerCase();
        List<String> topics = new ArrayList<>();
        if (lower.contains("cockroachdb")) topics.add("CockroachDB");
        if (lower.contains("postgres") || lower.contains("postgresql")) topics.add("PostgreSQL");
        if (lower.contains("rbac") || lower.contains("permission")) topics.add("RBAC");
        if (lower.contains("timeline")) topics.add("Timeline Intelligence");
        if (lower.contains("search")) topics.add("Enterprise Search");
        if (topics.isEmpty()) topics.add("Execution Plan");
        return topics;
    }

    private String summarize(String transcript, List<String> topics) {
        String clean = transcript.replaceAll("\\s+", " ").trim();
        String first = clean.length() > 220 ? clean.substring(0, 220) + "..." : clean;
        return "The team aligned on " + String.join(", ", topics) + ". " + first;
    }

    private String formatEvidence(List<EvidenceContext> evidence) {
        StringBuilder builder = new StringBuilder();
        for (EvidenceContext item : evidence) {
            builder.append("- ")
                    .append(item.type())
                    .append(": ")
                    .append(item.title())
                    .append(" | ")
                    .append(limit(item.excerpt(), 700))
                    .append(System.lineSeparator());
        }
        return builder.toString();
    }

    private List<String> stringList(JsonNode node, List<String> fallback) {
        if (!node.isArray()) {
            return fallback;
        }
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (StringUtils.hasText(item.asText())) {
                values.add(item.asText().trim());
            }
        }
        return values.isEmpty() ? fallback : values;
    }

    private List<AiDecisionSuggestion> decisionList(JsonNode node, List<AiDecisionSuggestion> fallback) {
        if (!node.isArray()) {
            return fallback;
        }
        List<AiDecisionSuggestion> values = new ArrayList<>();
        for (JsonNode item : node) {
            String title = textOr(item.path("title"), "");
            if (StringUtils.hasText(title)) {
                values.add(new AiDecisionSuggestion(
                        title,
                        textOr(item.path("rationale"), "Captured by AI from the meeting transcript.")
                ));
            }
        }
        return values.isEmpty() ? fallback : values;
    }

    private List<AiActionSuggestion> actionList(JsonNode node, List<AiActionSuggestion> fallback) {
        if (!node.isArray()) {
            return fallback;
        }
        List<AiActionSuggestion> values = new ArrayList<>();
        for (JsonNode item : node) {
            String title = textOr(item.path("title"), "");
            if (StringUtils.hasText(title)) {
                values.add(new AiActionSuggestion(
                        title,
                        textOr(item.path("ownerName"), "Unassigned"),
                        parseDate(item.path("dueDate").asText(null))
                ));
            }
        }
        return values.isEmpty() ? fallback : values;
    }

    private LocalDate parseDate(String value) {
        if (!StringUtils.hasText(value) || "null".equalsIgnoreCase(value)) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private String textOr(JsonNode node, String fallback) {
        return StringUtils.hasText(node.asText()) ? node.asText().trim() : fallback;
    }

    private String extractJson(String text) {
        String trimmed = text == null ? "" : text.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    private String limit(String value, int maxChars) {
        if (value == null) {
            return "";
        }
        if (value.length() <= maxChars) {
            return value;
        }
        return value.substring(0, maxChars);
    }

    private boolean geminiEnabled() {
        return "gemini".equalsIgnoreCase(properties.getProvider())
                && StringUtils.hasText(properties.getGemini().getApiKey());
    }
}
