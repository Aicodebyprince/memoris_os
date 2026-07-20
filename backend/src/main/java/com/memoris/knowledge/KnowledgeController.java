package com.memoris.knowledge;

import com.memoris.common.CurrentUser;
import com.memoris.knowledge.KnowledgeDtos.DocumentRequest;
import com.memoris.knowledge.KnowledgeDtos.DocumentResponse;
import com.memoris.knowledge.KnowledgeDtos.DocumentUploadRequest;
import com.memoris.knowledge.KnowledgeDtos.ProcessMeetingRequest;
import com.memoris.knowledge.KnowledgeDtos.ProcessMeetingResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/knowledge")
public class KnowledgeController {
    private final KnowledgeService knowledgeService;

    public KnowledgeController(KnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    @PostMapping("/meetings/process")
    ProcessMeetingResponse processMeeting(
            @AuthenticationPrincipal CurrentUser currentUser,
            @Valid @RequestBody ProcessMeetingRequest request
    ) {
        return knowledgeService.processMeeting(currentUser, request);
    }

    @PostMapping("/documents")
    DocumentResponse createDocument(
            @AuthenticationPrincipal CurrentUser currentUser,
            @Valid @RequestBody DocumentRequest request
    ) {
        return knowledgeService.createDocument(currentUser, request);
    }

    @PostMapping(value = "/documents/file", consumes = MediaType.APPLICATION_JSON_VALUE)
    DocumentResponse uploadDocument(
            @AuthenticationPrincipal CurrentUser currentUser,
            @Valid @RequestBody DocumentUploadRequest request
    ) {
        return knowledgeService.uploadDocument(currentUser, request);
    }

    @PostMapping(value = "/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    DocumentResponse uploadMultipartDocument(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String projectName,
            @RequestParam(required = false) String team
    ) {
        return knowledgeService.uploadDocument(currentUser, file, projectName, team);
    }
}
