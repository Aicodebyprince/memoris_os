package com.memoris.search;

import com.memoris.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ask")
public class AskMemorisController {
    private final AskMemorisService askMemorisService;

    public AskMemorisController(AskMemorisService askMemorisService) {
        this.askMemorisService = askMemorisService;
    }

    @PostMapping
    AskResponse ask(@AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody AskRequest request) {
        return askMemorisService.ask(currentUser, request.question());
    }

    record AskRequest(@NotBlank String question) {
    }

    public record AskResponse(
            String answer,
            boolean allowed,
            List<Evidence> evidence
    ) {
    }

    public record Evidence(
            String type,
            UUID id,
            String title,
            String excerpt
    ) {
    }
}
