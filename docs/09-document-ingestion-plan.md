# Document And Table Ingestion

Goal: accept real clinic files without forcing admins to hand-convert everything before preview.

## Current Layer

- `POST /api/ingestion/extract`
- Settings -> Import file extractor
- No direct database writes
- Output is text plus route suggestions into existing safe preview endpoints
- Output also includes a quality block: extraction quality, confidence, suggested target, detected signals, and the next safe action.

## Supported Inputs

- Plain text: TXT, CSV, TSV, JSON, XML
- Markup: HTML, RTF
- Office OpenXML: DOCX, XLSX, PPTX through a built-in ZIP/XML extractor
- OpenDocument: ODT, ODS, ODP through the same built-in ZIP/XML extractor
- PDF: best-effort embedded text extraction
- Images: detected as OCR inputs. For `pricelist`, the web client keeps the compressed image payload so the price-list analyzer can use server recognition or deterministic text fallback; other routes still avoid pretending that binary image content is structured text.
- ZIP: read-only nested extraction. Supported text/table entries are included in the review text, binary снимки and image entries become review references, and raw source/archive entry names are redacted to `Файл архива #...` / `Архив #...` aliases before the API response.

## Routing

The extractor returns candidate routes:

- `smart_import`: mixed patients/images/noise
- `patients`: patient import intake
- `imaging`: imaging manifest preview
- `pricelist`: price-list analyzer
- `plain_text`: manual review

The frontend copies extracted text into the selected admin workflow, or preserves a selected price-list image for OCR/Groq vision, keeping every write behind the existing preview/commit buttons.

## Quality Gate

- `ready`: extracted text has enough signals for the selected or suggested preview route.
- `review`: text exists, but routing confidence is not strong enough for an automatic next step.
- `ocr_required`: image/scanned content must go through OCR or vision before structured import.
- `unsupported`: no useful text was extracted; no database write should be attempted from this result.

## Limits

- Scanned PDFs still require OCR or server recognition; the current image route is implemented for price-list import first.
- XLSX formulas are not evaluated; stored values/shared strings are extracted.
- Legacy binary `.doc`, `.xls`, `.ppt` are accepted by the UI but intentionally not claimed as reliable. They should be converted by office software or handled later by a dedicated worker.
- File payload is bounded to protect local API memory.
- Bad document, ingestion, and price-list analyzer payloads return route-owned operator messages. The API must not expose zod `issues`, schema paths, parser tokens, or internal payload keys in these responses.

## Verification

- `npm run smoke:document-zip-redaction` builds a synthetic no-PHI ZIP with patient-like Cyrillic names, DICOM magic bytes, image entries, and a CSV price list. The smoke fails if raw patient-like archive names leak into preview text, warnings, or extracted file names.
- `npm run smoke:document-route-validation` exercises document create/issue/void, ingestion extract, and price-list analyze invalid payloads through Fastify routes and rejects raw schema/parser details.
