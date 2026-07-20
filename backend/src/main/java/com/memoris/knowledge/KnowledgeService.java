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
import com.memoris.knowledge.KnowledgeDtos.DocumentUploadRequest;
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
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
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
    private final DocumentTextExtractor textExtractor;
    private final DocumentChunker documentChunker;
    private final DocumentChunkRepository documentChunkRepository;
    private final Path uploadDirectory;

    private static final long MAX_UPLOAD_BYTES = 20L * 1024L * 1024L;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("txt", "md", "csv", "pdf", "doc", "docx");
    private static final Set<String> TEXT_EXTENSIONS = Set.of("txt", "md", "csv");

    public KnowledgeService(
            OrganizationRepository organizationRepository,
            AppUserRepository userRepository,
            ProjectRepository projectRepository,
            MeetingRepository meetingRepository,
            KnowledgeDocumentRepository documentRepository,
            DecisionRepository decisionRepository,
            ActionItemRepository actionItemRepository,
            TimelineEventRepository timelineEventRepository,
            MemorisAiService aiService,
            DocumentTextExtractor textExtractor,
            DocumentChunker documentChunker,
            DocumentChunkRepository documentChunkRepository,
            @Value("${app.uploads.directory}") String uploadDirectory
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
        this.textExtractor = textExtractor;
        this.documentChunker = documentChunker;
        this.documentChunkRepository = documentChunkRepository;
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
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
        documentRepository.flush();
        indexDocument(document, organization, project, request.summary());
        timeline(organization, actor, project, TimelineEventType.DOCUMENT_UPLOADED, "Document uploaded", document.getTitle(), "Document", document.getId(), team);
        return DocumentResponse.from(document);
    }

    @Transactional
    public DocumentResponse uploadDocument(CurrentUser currentUser, MultipartFile file, String projectName, String requestedTeam) {
        if (currentUser.role() == Role.GUEST) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Guests cannot upload documents");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a file to upload");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is too large. Maximum upload size is 20 MB");
        }

        String originalName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String safeName = sanitizeFilename(originalName);
        String extension = extension(safeName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Supported uploads: TXT, MD, CSV, PDF, DOC, DOCX");
        }

        String team = requestedTeam(currentUser, requestedTeam);
        Organization organization = organizationRepository.getReferenceById(currentUser.organizationId());
        AppUser actor = userRepository.getReferenceById(currentUser.userId());
        Project project = resolveProject(organization, projectName, team);

        String storageKey = currentUser.organizationId() + "/" + UUID.randomUUID() + "-" + safeName;
        Path target = uploadDirectory.resolve(storageKey).normalize();
        if (!target.startsWith(uploadDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid upload path");
        }

        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store uploaded document", exception);
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read uploaded document", exception);
        }
        String extractedText = textExtractor.extract(safeName, content);
        String summary = buildUploadSummary(file, safeName, extension, target, extractedText);
        KnowledgeDocument document = documentRepository.save(new KnowledgeDocument(
                organization,
                project,
                actor,
                titleFromFilename(safeName),
                extension.toUpperCase(Locale.ROOT),
                storageKey,
                summary,
                team
        ));
        documentRepository.flush();
        indexDocument(document, organization, project, extractedText.isBlank() ? summary : extractedText);
        timeline(organization, actor, project, TimelineEventType.DOCUMENT_UPLOADED, "Document uploaded", document.getTitle(), "Document", document.getId(), team);
        return DocumentResponse.from(document);
    }

    @Transactional
    public DocumentResponse uploadDocument(CurrentUser currentUser, DocumentUploadRequest request) {
        if (currentUser.role() == Role.GUEST) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Guests cannot upload documents");
        }

        String safeName = sanitizeFilename(request.filename());
        String extension = extension(safeName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Supported uploads: TXT, MD, CSV, PDF, DOC, DOCX");
        }

        byte[] content;
        try {
            content = Base64.getDecoder().decode(request.contentBase64());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid uploaded file content", exception);
        }
        if (content.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a file to upload");
        }
        if (content.length > MAX_UPLOAD_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is too large. Maximum upload size is 20 MB");
        }

        String team = requestedTeam(currentUser, request.team());
        Organization organization = organizationRepository.getReferenceById(currentUser.organizationId());
        AppUser actor = userRepository.getReferenceById(currentUser.userId());
        Project project = resolveProject(organization, request.projectName(), team);

        String storageKey = currentUser.organizationId() + "/" + UUID.randomUUID() + "-" + safeName;
        Path target = uploadDirectory.resolve(storageKey).normalize();
        if (!target.startsWith(uploadDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid upload path");
        }

        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store uploaded document", exception);
        }

        String extractedText = textExtractor.extract(safeName, content);
        String summary = buildUploadSummary(safeName, extension, content, extractedText);
        KnowledgeDocument document = documentRepository.save(new KnowledgeDocument(
                organization,
                project,
                actor,
                titleFromFilename(safeName),
                extension.toUpperCase(Locale.ROOT),
                storageKey,
                summary,
                team
        ));
        documentRepository.flush();
        indexDocument(document, organization, project, extractedText.isBlank() ? summary : extractedText);
        timeline(organization, actor, project, TimelineEventType.DOCUMENT_UPLOADED, "Document uploaded", document.getTitle(), "Document", document.getId(), team);
        return DocumentResponse.from(document);
    }

    private void indexDocument(KnowledgeDocument document, Organization organization, Project project, String extractedText) {
        String source = extractedText == null || extractedText.isBlank()
                ? document.getTitle() + ". " + document.getSummary()
                : extractedText;
        List<String> chunks = documentChunker.chunk(source);
        if (chunks.isEmpty()) {
            chunks = List.of(document.getTitle() + ". " + document.getSummary());
        }

        documentChunkRepository.deleteByDocumentId(document.getId());
        for (int index = 0; index < chunks.size(); index += 1) {
            String chunk = chunks.get(index);
            documentChunkRepository.saveChunk(
                    document.getId(),
                    organization.getId(),
                    project == null ? null : project.getId(),
                    index,
                    chunk,
                    aiService.embed(chunk),
                    document.getTeam()
            );
        }
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

    private String buildUploadSummary(MultipartFile file, String safeName, String extension, Path target, String extractedText) {
        long sizeKb = Math.max(1L, Math.round(file.getSize() / 1024.0));
        if (extractedText != null && !extractedText.isBlank()) {
            String excerpt = extractedText.trim().length() > 420 ? extractedText.trim().substring(0, 420) + "..." : extractedText.trim();
            return "Uploaded " + safeName + " (" + sizeKb + " KB). Extracted text excerpt: " + excerpt;
        }
        if (TEXT_EXTENSIONS.contains(extension)) {
            try {
                String content = Files.readString(target, StandardCharsets.UTF_8).trim();
                if (!content.isBlank()) {
                    String excerpt = content.length() > 420 ? content.substring(0, 420) + "..." : content;
                    return "Uploaded " + safeName + " (" + sizeKb + " KB). Text excerpt: " + excerpt;
                }
            } catch (IOException ignored) {
                // Fall back to the metadata summary below when the text file cannot be read.
            }
        }
        return "Uploaded " + safeName + " (" + sizeKb + " KB). Stored for organization search, timeline evidence, and future document parsing.";
    }

    private String buildUploadSummary(String safeName, String extension, byte[] content, String extractedText) {
        long sizeKb = Math.max(1L, Math.round(content.length / 1024.0));
        if (extractedText != null && !extractedText.isBlank()) {
            String excerpt = extractedText.trim().length() > 420 ? extractedText.trim().substring(0, 420) + "..." : extractedText.trim();
            return "Uploaded " + safeName + " (" + sizeKb + " KB). Extracted text excerpt: " + excerpt;
        }
        if (TEXT_EXTENSIONS.contains(extension)) {
            String text = new String(content, StandardCharsets.UTF_8).trim();
            if (!text.isBlank()) {
                String excerpt = text.length() > 420 ? text.substring(0, 420) + "..." : text;
                return "Uploaded " + safeName + " (" + sizeKb + " KB). Text excerpt: " + excerpt;
            }
        }
        return "Uploaded " + safeName + " (" + sizeKb + " KB). Stored for organization search, timeline evidence, and future document parsing.";
    }

    private String sanitizeFilename(String value) {
        String cleaned = value.replace("\\", "/");
        cleaned = cleaned.substring(cleaned.lastIndexOf('/') + 1);
        cleaned = cleaned.replaceAll("[^A-Za-z0-9._-]", "_");
        return cleaned.isBlank() ? "document" : cleaned;
    }

    private String extension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "txt";
        }
        return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String titleFromFilename(String filename) {
        int dot = filename.lastIndexOf('.');
        String title = dot > 0 ? filename.substring(0, dot) : filename;
        return title.replace('_', ' ').trim();
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
