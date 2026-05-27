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
- Images: detected as OCR/vision inputs. For `pricelist`, the web client keeps the compressed image payload so the price-list analyzer can use Groq vision or deterministic text fallback; other routes still avoid pretending that binary image content is structured text.
- ZIP: read-only nested extraction. Supported text/table entries are included in the review text, binary DICOM/image entries become imaging manifest references, and raw source/archive entry names are redacted to `Source file #...` / `Archive entry #...` aliases before the API response.

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

- Scanned PDFs still require OCR or Groq/vision; the current image bridge is implemented for price-list import first.
- XLSX formulas are not evaluated; stored values/shared strings are extracted.
- Legacy binary `.doc`, `.xls`, `.ppt` are accepted by the UI but intentionally not claimed as reliable. They should be converted by office software or handled later by a dedicated worker.
- File payload is bounded to protect local API memory.

## Verification

- `npm run smoke:document-zip-redaction` builds a synthetic no-PHI ZIP with patient-like Cyrillic names, DICOM magic bytes, image entries, and a CSV price list. The smoke fails if raw patient-like archive names leak into preview text, warnings, or extracted file names.
