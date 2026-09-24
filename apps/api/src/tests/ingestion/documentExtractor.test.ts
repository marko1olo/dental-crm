import assert from "node:assert";
import { describe, test } from "node:test";
import { deflateSync } from "node:zlib";
import type { DocumentIngestionRequest } from "@dental/shared";
import { extractDocument, readZipEntries } from "../../ingestion/documentExtractor.js";

describe("documentExtractor", () => {
	describe("extractDocument", () => {
		test("extracts plain text provided via rawText", () => {
			const request: DocumentIngestionRequest = {
				fileName: "test.txt",
				rawText: "Hello world!   \n\n This is a test. \n\n\n\n ",
				target: "plain_text",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #A6ED0C785D45.txt");
			assert.strictEqual(result.detectedKind, "txt");
			assert.strictEqual(
				result.extractedText,
				"Hello world!\n\n This is a test.",
			);
			assert.strictEqual(result.rowCount, 2);
			assert.strictEqual(result.tableCount, 0);
			assert.ok(
				result.routes.some(
					(route) => route.target === "plain_text" && route.enabled,
				),
			);
		});

		test("extracts simple text file provided via fileBase64", () => {
			const request: DocumentIngestionRequest = {
				fileName: "test_file.csv",
				fileBase64: "RmlsZSBjb250ZW50IGluIGJhc2U2NA==", // "File content in base64"
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #AAA0FF649053.csv");
			assert.strictEqual(result.detectedKind, "csv");
			assert.strictEqual(result.extractedText, "File content in base64");
			assert.strictEqual(result.byteSize, 22);
		});

		test("handles JSON known format", () => {
			const jsonContent = '{"key": "value"}';
			const base64Content = Buffer.from(jsonContent).toString("base64");
			const request: DocumentIngestionRequest = {
				fileName: "data.json",
				fileBase64: base64Content,
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #99377C63FBE5.json");
			assert.strictEqual(result.detectedKind, "json");
			assert.strictEqual(result.extractedText, '{"key": "value"}');
		});

		test("handles PDF format", () => {
			const pdfPrefix = "%PDF-1.4\n";
			const base64Content = Buffer.from(pdfPrefix).toString("base64");

			const request: DocumentIngestionRequest = {
				fileName: "document.pdf",
				fileBase64: base64Content,
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #5CF35F3F6FF8.pdf");
			assert.strictEqual(result.detectedKind, "pdf");
			assert.ok(result.warnings.includes("pdf_best_effort_no_ocr"));
			assert.ok(
				result.warnings.includes("pdf_text_not_extracted_may_be_scanned"),
			);
			assert.strictEqual(result.quality.extractionQuality, "ocr_required");
		});

		test("handles image format", () => {
			const base64Content = Buffer.from("fake image data").toString("base64");

			const request: DocumentIngestionRequest = {
				fileName: "photo.jpg",
				fileBase64: base64Content,
				target: "pricelist",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.fileName, "Файл #AFF6100BD4DF.jpg");
			assert.strictEqual(result.detectedKind, "image");
			assert.ok(result.warnings.includes("image_requires_ocr_or_vision"));
			assert.strictEqual(result.quality.extractionQuality, "ocr_required");
		});

		test("handles legacy database format", () => {
			const base64Content = Buffer.from("SQLite format 3\u0000").toString(
				"base64",
			);

			const request: DocumentIngestionRequest = {
				fileName: "database.sqlite",
				fileBase64: base64Content,
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.detectedKind, "legacy_database");
			assert.ok(
				result.extractedText.includes(
					"Источник старой базы: база SQLite Источник миграции",
				),
			);
			assert.ok(result.extractedText.includes("Тип источника: старая база"));
			assert.ok(
				result.warnings.includes("legacy_source_staging_manifest_only"),
			);
		});

		test("truncates large text strings", () => {
			const maxExtractedTextChars = 280_000;
			const largeText = "A".repeat(300_000);

			const request: DocumentIngestionRequest = {
				fileName: "large.txt",
				rawText: largeText,
				target: "plain_text",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.extractedText.length, maxExtractedTextChars);
			assert.ok(result.warnings.includes("extracted_text_truncated"));
		});

		test("decodes unknown format as text", () => {
			const base64Content = Buffer.from(
				"some text in an unknown extension",
			).toString("base64");

			const request: DocumentIngestionRequest = {
				fileName: "mystery.xyz",
				fileBase64: base64Content,
				target: "smart_import",
			};

			const result = extractDocument(request);

			assert.strictEqual(result.detectedKind, "unknown");
			assert.strictEqual(
				result.extractedText,
				"some text in an unknown extension",
			);
			assert.ok(result.warnings.includes("unknown_format_decoded_as_text"));
		});

		// ─── Новые тесты устойчивости и извлечения Формы 043/у ─────────────────

		test("handles severely corrupted ZIP without throwing or process crash", () => {
			// Случайные байты имитируют битый/обрезанный архив
			const corruptedBuffer = Buffer.from([
				0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
				0x08, 0x00, 0xff, 0xff, 0xff, 0xff, 0x50, 0x4b,
				0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x05, 0x00,
				0x05, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
			]);
			const zipRes = readZipEntries(corruptedBuffer);
			assert.ok(Array.isArray(zipRes.entries));
			assert.ok(zipRes.warnings.length > 0);

			const request: DocumentIngestionRequest = {
				fileName: "broken_archive.zip",
				fileBase64: corruptedBuffer.toString("base64"),
				target: "smart_import",
			};

			const result = extractDocument(request);
			assert.strictEqual(result.detectedKind, "zip");
			assert.ok(result.warnings.length > 0);
		});

		test("handles severely corrupted DOCX without throwing or process crash", () => {
			const corruptedDocx = Buffer.from("PK\x03\x04corrupted docx content truncated unexpectedly");
			const request: DocumentIngestionRequest = {
				fileName: "medical_record_broken.docx",
				fileBase64: corruptedDocx.toString("base64"),
				target: "smart_import",
			};

			const result = extractDocument(request);
			assert.strictEqual(result.detectedKind, "docx");
			assert.ok(result.warnings.length > 0);
			assert.ok(typeof result.extractedText === "string");
		});

		test("extracts text and structured tables from DOCX OpenXML", () => {
			// Создаем валидный минимальный ZIP-контейнер OpenXML DOCX с таблицей
			const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Медицинская карта стоматологического пациента</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Зуб</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Диагноз</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Лечение</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>16</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>К02.1 Кариес дентина</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Пломба светоотверждаемая</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

			// Сборка ZIP в памяти
			const docBuffer = Buffer.from(documentXml, "utf8");
			const fileName = "word/document.xml";
			const fileNameBuf = Buffer.from(fileName, "utf8");

			// Local header
			const localHeader = Buffer.alloc(30 + fileNameBuf.length);
			localHeader.writeUInt32LE(0x04034b50, 0);
			localHeader.writeUInt16LE(20, 4); // version needed
			localHeader.writeUInt16LE(0, 6); // flags
			localHeader.writeUInt16LE(0, 8); // method 0 (stored)
			localHeader.writeUInt16LE(0, 10); // time
			localHeader.writeUInt16LE(0, 12); // date
			localHeader.writeUInt32LE(0, 14); // crc
			localHeader.writeUInt32LE(docBuffer.length, 18); // comp size
			localHeader.writeUInt32LE(docBuffer.length, 22); // uncomp size
			localHeader.writeUInt16LE(fileNameBuf.length, 26);
			localHeader.writeUInt16LE(0, 28);
			fileNameBuf.copy(localHeader, 30);

			const localOffset = 0;

			// Central Directory
			const cdHeader = Buffer.alloc(46 + fileNameBuf.length);
			cdHeader.writeUInt32LE(0x02014b50, 0);
			cdHeader.writeUInt16LE(20, 4);
			cdHeader.writeUInt16LE(20, 6);
			cdHeader.writeUInt16LE(0, 8);
			cdHeader.writeUInt16LE(0, 10); // method 0
			cdHeader.writeUInt16LE(0, 12);
			cdHeader.writeUInt16LE(0, 14);
			cdHeader.writeUInt32LE(0, 16);
			cdHeader.writeUInt32LE(docBuffer.length, 20);
			cdHeader.writeUInt32LE(docBuffer.length, 24);
			cdHeader.writeUInt16LE(fileNameBuf.length, 28);
			cdHeader.writeUInt16LE(0, 30);
			cdHeader.writeUInt16LE(0, 32);
			cdHeader.writeUInt16LE(0, 34);
			cdHeader.writeUInt16LE(0, 36);
			cdHeader.writeUInt32LE(0, 38);
			cdHeader.writeUInt32LE(localOffset, 42);
			fileNameBuf.copy(cdHeader, 46);

			const cdOffset = localHeader.length + docBuffer.length;

			// EOCD
			const eocd = Buffer.alloc(22);
			eocd.writeUInt32LE(0x06054b50, 0);
			eocd.writeUInt16LE(0, 4);
			eocd.writeUInt16LE(0, 6);
			eocd.writeUInt16LE(1, 8); // total on disk
			eocd.writeUInt16LE(1, 10); // total entries
			eocd.writeUInt32LE(cdHeader.length, 12);
			eocd.writeUInt32LE(cdOffset, 16);
			eocd.writeUInt16LE(0, 20);

			const docxZipBuffer = Buffer.concat([localHeader, docBuffer, cdHeader, eocd]);

			const request: DocumentIngestionRequest = {
				fileName: "043_card_patient.docx",
				fileBase64: docxZipBuffer.toString("base64"),
				target: "smart_import",
			};

			const result = extractDocument(request);
			assert.strictEqual(result.detectedKind, "docx");
			assert.strictEqual(result.tableCount, 1);
			assert.ok(result.extractedText.includes("16\tК02.1 Кариес дентина\tПломба светоотверждаемая"));
			assert.ok(result.extractedText.includes("Зуб\tДиагноз\tЛечение"));
		});

		test("extracts text from PDF with compressed FlateDecode streams", () => {
			const streamContent = Buffer.from(
				"BT /F1 12 Tf 72 712 Td (Пациент: Иванов Иван Иванович) Tj T* (Форма 043/у) Tj ET",
				"utf8",
			);
			const compressedStream = deflateSync(streamContent);

			const pdfBody = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${compressedStream.length} /Filter /FlateDecode >>
stream
`;
			const pdfTail = `
endstream
endobj
xref
0 5
trailer
<< /Root 1 0 R >>
%%EOF`;

			const pdfBuffer = Buffer.concat([
				Buffer.from(pdfBody, "latin1"),
				compressedStream,
				Buffer.from(pdfTail, "latin1"),
			]);

			const request: DocumentIngestionRequest = {
				fileName: "form_043_card.pdf",
				fileBase64: pdfBuffer.toString("base64"),
				target: "smart_import",
			};

			const result = extractDocument(request);
			assert.strictEqual(result.detectedKind, "pdf");
			assert.ok(result.extractedText.includes("Иванов Иван Иванович"));
			assert.ok(result.extractedText.includes("Форма 043/у"));
			assert.ok(result.quality.signals.includes("форма 043/у"));
			assert.strictEqual(result.quality.extractionQuality, "ready");
			assert.ok(result.quality.nextAction.includes("Форма 043/у"));
		});

		test("detects Form 043/у signals and configures smart_import route with high confidence", () => {
			const cardText = `
Министерство здравоохранения РФ
Медицинская карта стоматологического больного
Форма № 043/у
Пациент: Сидорова Анна Михайловна, дата рождения: 12.04.1985
Телефон: +7 (926) 123-45-67
Диагноз: К04.0 Начальный пульпит зуба 24
Зубная формула:
18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28
48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38
Дневник врача: под анестезией ультракаин 1.7 мл раскрыта полость зуба 24.
`;
			const request: DocumentIngestionRequest = {
				fileName: "spravka_043.txt",
				rawText: cardText,
				target: "smart_import",
			};

			const result = extractDocument(request);
			assert.ok(result.quality.signals.includes("форма 043/у"));
			assert.ok(result.quality.signals.includes("стоматологическая карта"));
			assert.ok(result.quality.signals.includes("русский текст"));
			assert.ok(result.quality.signals.includes("похож на телефон"));
			assert.strictEqual(result.quality.extractionQuality, "ready");
			assert.strictEqual(result.quality.confidence, 0.92);

			const smartRoute = result.routes.find((r) => r.target === "smart_import");
			assert.ok(smartRoute);
			assert.strictEqual(smartRoute.title, "Предпросмотр карты 043/у и импорта");
			assert.ok(smartRoute.reason.includes("Форма 043/у"));
		});

		test("demonstrates ReDoS immunity on pathological repetitive phone-like strings", () => {
			const startTime = Date.now();
			// Патологическая строка, вызывающая экспоненциальный бэктрекинг в уязвимых regex
			const pathological = "1" + "- ".repeat(15_000);
			const request: DocumentIngestionRequest = {
				fileName: "pathological.txt",
				rawText: pathological,
				target: "plain_text",
			};

			const result = extractDocument(request);
			const durationMs = Date.now() - startTime;

			assert.ok(durationMs < 200, `Regex evaluation took too long: ${durationMs}ms`);
			assert.strictEqual(result.detectedKind, "txt");
		});
	});
});
