package com.memoris.config;

import com.memoris.ai.MemorisAiService;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BackendHomeController {
    private final MemorisAiService aiService;

    public BackendHomeController(MemorisAiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/")
    Map<String, Object> home() {
        return Map.of(
                "service", "Memoris OS Backend",
                "status", "running",
                "aiProvider", aiService.activeProvider(),
                "frontend", "http://127.0.0.1:5173/",
                "loginApi", "/api/auth/login",
                "timestamp", OffsetDateTime.now().toString()
        );
    }

    @GetMapping("/api/health")
    Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "aiProvider", aiService.activeProvider(),
                "timestamp", OffsetDateTime.now().toString()
        );
    }
}
