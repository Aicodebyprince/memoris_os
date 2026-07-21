package com.memoris.knowledge;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.IntStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;

class DocumentRagUtilitiesTest {
    private final DocumentTextExtractor extractor = new DocumentTextExtractor();
    private final DocumentChunker chunker = new DocumentChunker();

    @Test
    void extractsTextFromPdf() throws IOException {
        byte[] pdf = pdfWithText("PostgreSQL was selected for relational modeling and pgvector search.");

        String text = extractor.extract("architecture-decision.pdf", pdf);

        assertThat(text).contains("PostgreSQL was selected");
        assertThat(text).contains("pgvector search");
    }

    @Test
    void extractsTextFromDocx() throws IOException {
        byte[] docx = docxWithText("CockroachDB is deferred until distributed SQL is required.");

        String text = extractor.extract("memoris-architecture-tech-stack.docx", docx);

        assertThat(text).contains("CockroachDB is deferred");
        assertThat(text).contains("distributed SQL");
    }

    @Test
    void extractsTextDocumentsDirectly() {
        String text = extractor.extract(
                "notes.txt",
                "RBAC must filter document chunks before AI receives context.".getBytes(StandardCharsets.UTF_8)
        );

        assertThat(text).contains("RBAC must filter");
    }

    @Test
    void chunksLongTextWithOverlap() {
        String text = String.join(" ", IntStream.range(0, 240)
                .mapToObj(index -> "term" + index)
                .toList());

        List<String> chunks = chunker.chunk(text);

        assertThat(chunks).hasSize(2);
        assertThat(chunks.get(0)).contains("term0").contains("term179");
        assertThat(chunks.get(1)).contains("term145").contains("term239");
    }

    private byte[] pdfWithText(String text) throws IOException {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(PDType1Font.HELVETICA, 12);
                stream.newLineAtOffset(72, 720);
                stream.showText(text);
                stream.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private byte[] docxWithText(String text) throws IOException {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.createParagraph().createRun().setText(text);
            document.write(output);
            return output.toByteArray();
        }
    }
}
