package com.memoris.common;

import java.time.OffsetDateTime;

public record ApiError(
        String message,
        String code,
        OffsetDateTime timestamp
) {
    public static ApiError of(String message, String code) {
        return new ApiError(message, code, OffsetDateTime.now());
    }
}
