package com.memoris.ai;

import java.util.UUID;

public record EvidenceContext(
        String type,
        UUID id,
        String title,
        String excerpt
) {
}
