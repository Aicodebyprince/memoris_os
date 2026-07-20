package com.memoris.knowledge;

import java.util.UUID;

public record DocumentChunkHit(
        UUID chunkId,
        UUID documentId,
        String documentTitle,
        String content,
        String team,
        double score
) {
}
