package com.memoris.knowledge;

import com.memoris.common.CurrentUser;
import com.memoris.knowledge.KnowledgeDtos.DocumentRequest;
import com.memoris.knowledge.KnowledgeDtos.DocumentResponse;
import com.memoris.knowledge.KnowledgeDtos.ProcessMeetingRequest;
import com.memoris.knowledge.KnowledgeDtos.ProcessMeetingResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
