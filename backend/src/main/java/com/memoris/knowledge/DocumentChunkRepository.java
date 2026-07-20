package com.memoris.knowledge;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DocumentChunkRepository {
    private final JdbcTemplate jdbcTemplate;

    public DocumentChunkRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void deleteByDocumentId(UUID documentId) {
        jdbcTemplate.update("delete from document_chunks where document_id = ?", documentId);
    }

    public void saveChunk(
            UUID documentId,
            UUID organizationId,
            UUID projectId,
            int chunkIndex,
            String content,
            List<Double> embedding,
            String team
    ) {
        jdbcTemplate.update(
                """
                        insert into document_chunks (
                            id, document_id, organization_id, project_id, chunk_index, content,
                            token_count, embedding, team, created_at
                        )
                        values (?, ?, ?, ?, ?, ?, ?, ?::vector, ?, ?)
                        """,
                UUID.randomUUID(),
                documentId,
                organizationId,
                projectId,
                chunkIndex,
                content,
                approximateTokenCount(content),
                vectorLiteral(embedding),
                team,
                OffsetDateTime.now()
        );
    }

    public List<DocumentChunkHit> search(UUID organizationId, String team, List<Double> queryEmbedding, int limit) {
        String vector = vectorLiteral(queryEmbedding);
        if (team != null && !team.isBlank()) {
            return jdbcTemplate.query(
                    """
                            select
                                dc.id as chunk_id,
                                dc.document_id,
                                d.title as document_title,
                                dc.content,
                                dc.team,
                                (1 - (dc.embedding <=> ?::vector)) as score
                            from document_chunks dc
                            join documents d on d.id = dc.document_id
                            where dc.organization_id = ?
                            and dc.team = ?
                            order by dc.embedding <=> ?::vector
                            limit ?
                            """,
                    (rs, rowNum) -> new DocumentChunkHit(
                            rs.getObject("chunk_id", UUID.class),
                            rs.getObject("document_id", UUID.class),
                            rs.getString("document_title"),
                            rs.getString("content"),
                            rs.getString("team"),
                            rs.getDouble("score")
                    ),
                    vector,
                    organizationId,
                    team,
                    vector,
                    limit
            );
        }
        return jdbcTemplate.query(
                """
                        select
                            dc.id as chunk_id,
                            dc.document_id,
                            d.title as document_title,
                            dc.content,
                            dc.team,
                            (1 - (dc.embedding <=> ?::vector)) as score
                        from document_chunks dc
                        join documents d on d.id = dc.document_id
                        where dc.organization_id = ?
                        order by dc.embedding <=> ?::vector
                        limit ?
                        """,
                (rs, rowNum) -> new DocumentChunkHit(
                        rs.getObject("chunk_id", UUID.class),
                        rs.getObject("document_id", UUID.class),
                        rs.getString("document_title"),
                        rs.getString("content"),
                        rs.getString("team"),
                        rs.getDouble("score")
                ),
                vector,
                organizationId,
                vector,
                limit
        );
    }

    private int approximateTokenCount(String content) {
        if (content == null || content.isBlank()) {
            return 0;
        }
        return Math.max(1, content.trim().split("\\s+").length);
    }

    private String vectorLiteral(List<Double> embedding) {
        StringBuilder builder = new StringBuilder("[");
        for (int index = 0; index < embedding.size(); index += 1) {
            if (index > 0) {
                builder.append(',');
            }
            double value = embedding.get(index);
            if (Double.isNaN(value) || Double.isInfinite(value)) {
                value = 0.0;
            }
            builder.append(value);
        }
        builder.append(']');
        return builder.toString();
    }
}
