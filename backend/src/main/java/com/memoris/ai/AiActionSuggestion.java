package com.memoris.ai;

import java.time.LocalDate;

public record AiActionSuggestion(
        String title,
        String ownerName,
        LocalDate dueDate
) {
}
