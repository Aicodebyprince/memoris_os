package com.memoris.knowledge;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DocumentChunker {
    private static final int TARGET_WORDS = 180;
    private static final int OVERLAP_WORDS = 35;
    private static final int MAX_CHUNKS = 80;

    public List<String> chunk(String text) {
        String normalized = text == null ? "" : text.replaceAll("\\s+", " ").trim();
        if (normalized.isBlank()) {
            return List.of();
        }

        String[] words = normalized.split("\\s+");
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < words.length && chunks.size() < MAX_CHUNKS) {
            int end = Math.min(words.length, start + TARGET_WORDS);
            StringBuilder builder = new StringBuilder();
            for (int index = start; index < end; index += 1) {
                if (!builder.isEmpty()) {
                    builder.append(' ');
                }
                builder.append(words[index]);
            }
            chunks.add(builder.toString());
            if (end == words.length) {
                break;
            }
            start = Math.max(end - OVERLAP_WORDS, start + 1);
        }
        return chunks;
    }
}
