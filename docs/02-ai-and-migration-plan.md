# AI and Migration Plan

Date: 2026-05-12

## AI Boundary

AI is an assistant layer, not the source of truth.

Allowed first:
- voice transcription into visit-note draft;
- image attachment summary as a draft;
- protocol template filling;
- patient callback/message draft;
- schedule-gap suggestions.

Forbidden until legal review:
- automatic final diagnosis;
- automatic treatment prescription;
- unsupervised changes to signed EMR;
- hidden use of AI output without audit trail.

Required audit fields later:
- ai_jobs.id;
- modelName;
- promptVersion;
- input attachment hash;
- doctor review decision;
- accepted/rejected timestamp.

Local references from existing projects:
- `C:\Users\danat\Desktop\stomchat\gemini_client.py` already rotates Gemini keys and retries 503/429.
- `C:\Users\danat\Desktop\stomchat\vision.py` already compresses images and sends vision requests through an OpenAI-compatible client.

Do not copy those files directly into the CRM core. Extract the pattern into a worker behind `/api/ai/*` or a queue consumer.

## Migration Plan

Phase 1:
- CSV/XLSX import for patients.
- Preview table before commit.
- Dedupe by normalized phone, full name, birth date.
- Import batch log with source name and row status.

Phase 2:
- Service catalog import.
- Visit/protocol import.
- Payment/document import.
- Price-list import with material/brand/restoration taxonomy, preview, and explicit mapping to internal services.

Phase 3:
- Presets for common competitors if exported formats are obtained.
- Semi-automatic field mapping using AI, but final mapping confirmed by user.
- Smart mixed-export parser that can split one messy input into patients, images, and ignored rows before commit.
- Optional server image/text extraction for price-list photos/OCR, with deterministic fallback and schema validation before anything reaches the catalog.

## Current Implemented Stub

Endpoint:
- `POST /api/ai/visit-note-draft`

Input:
- `patientId`
- `transcript`
- `specialty`
- `source`

Output:
- complaint;
- anamnesis;
- objectiveStatus;
- diagnosis stays nullable and must be doctor-confirmed;
- treatmentPlan;
- warnings.

Current behavior:
- the API endpoint is a deterministic specialty-aware rule parser, not a real model call;
- the web client uses the same shared parser for offline/API-failure mode, so online and offline drafts do not diverge;
- parser profiles exist for therapy, prosthetics, surgery, orthodontics, periodontology, hygiene/prevention, pediatric dentistry, implantology, radiology, and general exams;
- the parser prioritizes explicit transcript sections such as `Жалобы`, `Объективно`, `Диагноз`, and `План` before keyword fallback, so a word from the complaint is not accidentally treated as the treatment plan;
- neither parser signs EMR, finalizes diagnosis, or hides warnings;
- keys from older projects must not be copied into the CRM client or repo; future model keys belong in a worker/secret store behind `/api/ai/*`.
- reviewed visit-note saves have a browser queue for temporary API/network failure; this queue is continuity, not legal final signing.
- accepted visit-note saves include a client mutation id, base revision, server revision, and save receipt; retries are treated as duplicate-safe sync events instead of new clinical actions.
- AI recognition and visit-note draft scope failures return stable public codes (`AiRecognitionScopeError`, `VisitNoteDraftScopeError`) with separate Russian operator `message` fields; runtime smoke rejects `patientId`, `imagingStudyId`, parser/schema, null/undefined, and request-shape leaks in those public responses.
- Settings -> AI now renders recognition job warnings through a UI-owned clinical label map, so stable backend warnings like OCR/preview/AI safety notes stay machine-readable while admins see review actions.

Implemented speech-provider planning:
- Settings -> AI now exposes a typed `speechProviders` catalog for browser dictation, Groq Whisper, OpenAI transcription, Deepgram streaming, AssemblyAI async/streaming, Cloudflare Workers AI Whisper, Azure AI Speech, Google Cloud Speech-to-Text, Hugging Face ASR, future native mobile speech, Whisper.cpp, and Vosk;
- the recommended pilot is browser dictation first, then Groq Whisper through a server-side key, then OpenAI transcription/polish if the clinic already uses the AI worker;
- provider keys must stay in API server environment variables, never in the browser, mobile bundle, repo, or logs;
- recording architecture should prefer short idempotent chunks saved locally before upload, not one fragile full-visit upload;
- raw transcript, parser output, optional polished draft, provider/model metadata, warnings, and doctor-reviewed final text must be stored separately for audit.
- detailed implementation plan lives in `docs/05-speech-transcription-plan.md`.
- `/api/speech/status` and `/api/speech/transcribe-chunk` now provide the first server gateway: Groq/OpenAI/Deepgram/AssemblyAI/Cloudflare Workers AI are routed through the API server, audio is size-limited, raw audio is discarded after forwarding, and transcript chunks are persisted with provider/status/warnings.
- `/api/speech/polish-transcript` gives a non-AI safety polish for noisy STT: section cleanup, FDI tooth numbers, common dental abbreviations, and specialty-aware draft generation without inventing diagnosis or treatment.
- Specialty-aware visit-note drafting now returns a compact quality gate with confidence, detected teeth, signals, missing critical fields, and next action; this is doctor-facing guidance, not a blocking validation.
- `/api/pricelist/analyze` parses copied tables/OCR/photo text into validated price-list JSON: category, specialty, material kind, restoration type, crown type, brand, unit, price, confidence, warnings, and candidate service mapping.
- Settings -> Prices keeps this admin-only and now includes a collapsed recognition catalog for treatment groups, material/restoration types, implant/graft/ortho/composite/ceramic brands, anesthetics, and lab/imaging markers without polluting the doctor visit screen.
- Settings -> Prices now renders price-list warning ids through UI-owned Russian operator labels; source smoke blocks raw `price_not_found`, `image_payload_invalid`, and similar analyzer ids from the visible result panel.
- Settings -> Прайс keeps this admin-only so doctors do not see foreign specialties/material dictionaries during a visit.
- `/api/speech/status` now also returns the smart chunking policy, auto/provider fallback state, setup hint, and polish policy. The web recorder uses Web Audio RMS monitoring to cut after silence or max duration, and falls back to time-only MediaRecorder chunks when the browser cannot analyze audio.
- `/api/speech/recordings/:recordingId/assemble` reconstructs a server-side transcript from saved chunks and reports missing indexes, so local retry/refresh does not silently lose the doctor's dictation.
- STT provider keys now support server-only multi-key pools (`*_API_KEYS` and `*_API_KEY_1..N`), random rotation, per-key cooldown after 429/auth/timeout/transient-network/5xx errors, and safe count-only status in Settings.
- `/api/speech/providers/runtime` gives admins a safe provider matrix for browser/Groq/OpenAI/Deepgram/AssemblyAI/Cloudflare/Azure/Google/Hugging Face/mobile/local options without exposing provider secrets or adding vendor choices to the doctor's treatment screen.
- `/api/speech/recording-strategy` makes voice capture policy explicit: online ready provider -> chunked upload, offline -> local queue, local-only -> no cloud/neural polish, long recording -> async-safe path.
- `/api/speech/recordings/recovery` groups saved chunks into recoverable recordings with missing-index detection, status counts, transcript preview, and next action so browser refresh/offline retry does not hide lost dictation.
- STT chunk persistence now includes a quality object (`clear`, `review`, `empty`, `failed`) with confidence, word/character counts, duration/byte signals, provider warnings, and a next safe action. Groq is requested with `verbose_json` so Whisper segment quality metadata can be used when available.
- STT chunk retries are now upgrade-safe: the same `recordingId + chunkIndex` can replace a failed/empty/lower-quality server chunk with better text, while a worse retry cannot destroy a usable transcript.
- `/api/system/local-bridges/readiness` now checks optional local Whisper.cpp/Vosk bridge health endpoints without sending audio, so one clinic PC can use a local/offline STT lane later while the Visit screen keeps the same non-blocking typing/chunk queue behavior.
- `/api/system/local-bridges/use-plans` now selects the safe current dictation path from local bridge readiness, server STT key availability, browser/local queueing, and deterministic parser fallback. It is Settings diagnostics, not a doctor-facing provider chooser.
- Visit now has a single doctor-facing next-step panel and progress strip (`Диктовка -> Черновик -> ЭМК -> Закрытие`), so a low-PC-skill doctor sees one primary action before the detailed dictation/EMK controls.
- The Visit and Settings speech UI uses clinic wording (`распознавание речи`, `Распознать на сервере`, `Очистить текст`) instead of STT/Recovery/gateway jargon on the main path.

Implemented migration preview:
- `POST /api/imports/patients/preview`
- accepts pasted CSV/TSV/semicolon text;
- recognizes common Russian and English patient headers;
- normalizes Russian phone numbers and `DD.MM.YYYY` birth dates;
- flags duplicate phone/name against the current patient set;
- returns `ready`, `warning`, and `blocked` rows without writing to the database.

Implemented intelligent intake:
- `POST /api/imports/patients/intake`
- accepts `csv_text`, `xlsx_copy`, `mis_export`, `image_ocr`, `voice_dictation`, and `free_text`;
- normalizes unstructured OCR/dictation/free text into the same preview pipeline;
- extracts Russian phone numbers, birth dates, and likely full names from journal-like lines;
- keeps OCR/voice as a recognition layer before preview, not as a direct database write.

Implemented imaging intake:
- `GET /api/imaging/studies`
- `POST /api/imaging/studies`
- `GET /api/imaging/studies/:id/preview.svg`
- `POST /api/imaging/imports/preview`
- `POST /api/imaging/imports/commit`
- `POST /api/imaging/folders/scan-preview`
- `POST /api/imaging/dicom/series-preview`
- `POST /api/imaging/dicom/folder-series-preview`
- `POST /api/imaging/dicomweb/check`
- `POST /api/imaging/dicom/viewer-launch-manifest`
- `POST /api/imaging/dicom/viewer-tool-state`
- `POST /api/imaging/dicom/workstation-readiness`
- `POST /api/imaging/dicom/render-cache-plan`
- `POST /api/imaging/dicom/viewer-workbench-manifest`
- `POST /api/imaging/dicom/folder-workup-plan`
- supports periapical/RVG, bitewing, OPG, TRG/ceph, CBCT, photo, and fallback image records;
- accepts manual upload, DICOM file, DICOMweb, PACS, TWAIN/WIA, sensor bridge, and watched-folder source kinds;
- parses CSV/TSV/semicolon/pipe manifests from imaging exports;
- scans a server-side watched folder read-only, finds DICOM/IMA/JPG/PNG/TIFF/BMP/WebP files, generates a structured manifest, and preserves Windows paths with spaces;
- scans local DICOM/IMA files and regular ZIP archives read-only for DICOM headers, then builds a metadata manifest from PatientName, Modality, StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID, descriptions, InstanceNumber, and StudyDate/AcquisitionDate without loading pixel data;
- detects DICOM/IMA/JPG/PNG/TIFF/BMP/WebP/ZIP/7z/RAR file paths, RVG/OPG/TRG/CBCT/periapical synonyms, common dental imaging exporters, tooth numbers, dates, and Russian phones;
- expands available ZIP central directories read-only into virtual DICOM entry rows for preview, while unsupported archive formats stay warnings instead of blocking unrelated rows;
- groups DICOM/CBCT manifests into series by StudyInstanceUID/SeriesInstanceUID or by folder fallback, with modality, file count, viewer recommendation, `mprReadiness`, and patient-match warnings before any viewer or commit step;
- checks DICOMweb/QIDO roots and builds OHIF/Cornerstone/external-viewer launch manifests without storing pixels, leaking PACS secrets, or mutating STOW state;
- exports saved CRM viewer state and annotations as a pixel-free Cornerstone/OHIF tool-state bundle so an embedded or external viewer can restore markup after loading the real DICOM series;
- compares CBCT resource policy with browser workstation capability before deciding whether to stream in-browser, downsample first, or hand off to an external viewer;
- returns a GPU render plan for CBCT/MPR so weak video chips stay on preview/external handoff and diagnostic workstations can use shared/bricked 3D texture strategies;
- returns a render-cache execution plan so future CBCT viewers decode the active slice and first scroll window before background bricks, panoramic reconstruction, and cache persistence;
- combines readiness, cache, launch, and tool-state into `/api/imaging/dicom/viewer-workbench-manifest`, the preferred one-click CT/MPR workbench path for admins;
- persists the pixel-free CT/MPR workbench contract through `/api/imaging/dicom/workbench-bundles`, so a prepared workbench can be restored from the server and local browser recovery without storing raw DICOM pixels; server-side bundles redact local file paths and require reconnecting the folder/device before pixel load;
- lets Settings reconnect a server-restored CT/MPR bundle to the current workstation folder by rerunning folder workup and workbench manifest creation against the selected local path, then saving a freshly redacted server copy;
- combines local folder header scan, series grouping, workstation readiness, and render-cache planning through `/api/imaging/dicom/folder-workup-plan`, so a CBCT folder can be triaged in one admin action without loading pixels or cluttering the doctor's screen;
- discovers likely local CT/DICOM folders through `/api/imaging/dicom/local-folder-discovery` by scanning configured roots plus Downloads/Desktop/Documents/Pictures/OneDrive export folders with bounded filename/header checks, so admins can find patient CT exports without exposing filesystem complexity to the doctor;
- organizes local imaging sources through `/api/imaging/local-organizer/scan-preview`, combining CT/DICOM candidates, archive references, and dental 3D model files (`STL`, `OBJ`, `PLY`, `GLB`, `GLTF`, `3MF`) into case-level recommendations while keeping all pixels/meshes local and metadata-only; Settings displays safe local aliases/source labels/fingerprints until a folder is explicitly selected;
- `/api/system/local-bridges/readiness` also reports optional CT/DICOM worker, OCR worker, and external viewer availability with redacted URLs and localhost/private-LAN default probing, so Settings can prepare heavy imaging/OCR handoff without cluttering the doctor's Visit screen;
- `/api/system/local-bridges/use-plans` maps CT/MPR, imaging import, document OCR, and price-photo OCR to a local module, server image recognition, metadata-only preview, or manual review depending on the current workstation. It does not write imports or open diagnostic image data by itself.
- matches rows to patients by normalized phone or exact full name;
- returns `ready`, `warning`, and `blocked` rows before any file copy or database write;
- commits only `ready` rows, creates imaging records, stores source/file path metadata, and leaves each image in `needs_review` until a doctor checks it.
- the Shift imaging viewer now provides lightweight 2D controls (rotate, flip, invert, brightness, contrast, zoom, reset) for RVG/OPG/TRG/photos without exposing PACS plumbing to the doctor.
- Settings -> Sources now has a compact CBCT/MPR readiness workbench for projection choice, oblique axis angle, slab thickness, window preset, crosshair, linked planes, blockers, warnings, and external viewer handoff.
- Settings -> Sources now also has a compact DICOMweb/OHIF handoff panel with connector status, QIDO latency, WADO readiness, STOW-not-probed warning, and viewer manifest output.
- full CBCT/CT viewing remains a separate DICOMweb/Cornerstone/OHIF module with real series loading, 3-plane MPR, oblique planes, panoramic curve reconstruction, cache, and audit; the current prototype does not pretend that a single SVG preview is a diagnostic 3D viewer.

Implemented smart mixed import:
- `POST /api/imports/smart/preview`
- `POST /api/imports/smart/commit`
- `POST /api/imports/smart/report.csv`
- `POST /api/imports/smart/report.safe.csv`
- accepts one mixed text source from old MIS exports, Excel copy, RVG folder manifests, OCR text, dictation, old database paths, archive references, PACS/DICOM hints, or network-share notes;
- classifies each non-empty line as `patient`, `imaging`, `clinic`, `legacy_source`, or `ignored` with confidence and reason;
- separates clinic requisites/profile facts from patient/imaging rows; suggested clinic fields are never written by smart import commit;
- extracts likely clinic name, INN/KPP/OGRN, address, phone, email, website, medical license facts, and bank-detail lines into a review-only `clinicSuggestion`;
- exposes legacy-source paths as `safeSourceAlias` fingerprints in UI/reports, while keeping raw `sourceRef` only inside the parser contract for explicit admin routing;
- detects legacy source candidates for Firebird/InterBase, Access, SQLite, SQL dumps/backups, CSV/TSV, XLS/XLSX, archives, PACS/DICOMweb, DICOMDIR/CBCT folders, RVG/ОПТГ/photo archives, vendor imaging systems such as Sidexis/Romexis/Vatech/Carestream/Planmeca, old MIS names, and network shares;
- returns required artifacts and safe next actions per legacy source, so a non-technical clinic user knows whether to bring a database copy, tabular export, CT/image folder, imaging archive endpoint, or read-only network path;
- returns a migration plan covering old patient DB, CT/RVG/DICOM/photo archive, clinic profile facts, public lookup readiness, and legacy-source staging readiness;
- exports a separate static-name safe handoff CSV from `report.safe.csv` for admin/doctor/vendor migration work: aggregate patient/imaging row status, clinic public fields, public lookup targets, source aliases, fingerprints, route guidance, and privacy warnings only. It deliberately omits patient names, phones, birth dates, notes, raw source text, local paths, file names, DICOM pixels, and legacy DB names. The older `report.csv` stays an internal clinic report because it includes patient/imaging preview details for operator validation;
- dynamic internal smart-import report downloads sanitize the source-derived filename, strip path-like dots, and fall back to `smart_import_report.csv` for reserved Windows device names;
- returns safe public lookup links for Google Maps, Яндекс.Карты, 2ГИС, website search, official ФНС ЕГРЮЛ/ЕГРИП, Rusprofile fallback, and Росздравнадзор license search from clinic name/address/INN/license only; patient names, phones, birth dates, CT/X-ray terms, image filenames, legacy DB paths, and imaging paths are stripped before any public query is prepared;
- `POST /api/imports/smart/local-source-discovery` scans bounded local roots read-only for old DBs, 1C `.1cd`/`.dt`, SQL Server/Firebird/Access/SQLite, DBF/FoxPro/Clipper folder databases (`.dbf` with `.dbt/.fpt/.cdx/.idx` companions), dumps, spreadsheets, archives, DICOMDIR/CBCT folders, RVG/ОПТГ/photo archives, dental 3D models, and known vendor imaging folders; Settings shows source numbers, fingerprints, counters, and reasons first, then lets an admin send the chosen source into the smart parser;
- Discovery responses expose scan roots only as `local-root:*`, `network-root:*`, `remote-root:*`, or `browser-local:*` aliases; raw filesystem roots stay server/workstation-local and are not returned to Settings or reports. Local discovery candidates now use `migration-source:*` route tokens instead of raw `sourceRef` paths; workup/probe resolve those tokens server-side, and expired tokens force a new scan instead of guessing a path;
- Local discovery now uses workstation profiles and a priority queue for suspicious folders, so a noisy desktop/server disk can surface 1C/1Cv8, Инфоклиника, ИНФОДЕНТ/Denta Office, Cliniccards, Dental4Windows, Dental Pro, DentalSoft/Denta, Clinic365/Dental Cloud, MedAngel/Medialog/Arnica, IDENT/StomX, Firebird/InterBase, Access, SQL Server, SQLite, Sidexis/Sirona, Romexis/Planmeca, Vatech/EzDent, Carestream/Kodak, Morita/i-Dixel, NewTom/NNT/MyRay, Owandy/QuickVision, DEXIS/KaVo/Gendex, Acteon/SOPRO/SOPIX/PSPIX/X-Mind, OnDemand3D, Invivo, Cliniview, DBSWIN/VistaSoft, Digora/Soredex, Trophy/Visiodent, Mediadent/VixWin/Sopro/Schick, DTX Studio, 3Shape/Medit/exocad, DICOM/PACS, RVG/OPG/XRay, and generic clinic backup/export/data folders even before an admin manually browses into them;
- Inside each scanned folder, discovery prioritizes DB/dump/DICOM/table/archive artifacts and vendor-like names before generic files, so `maxFilesPerFolder` protects runtime without hiding a legacy DB behind dozens of unrelated notes/logs;
- Default PC discovery also adds external/mapped Windows drives `D:`-`Z:`, common data folders on those drives (`Dental`, `DICOM`, `PACS`, `XRay`, `CBCT`, `1C`, vendor folders, `Backup`, `Export`), configured `DENTAL_MIGRATION_NETWORK_ROOTS`, and Windows mapped-drive roots from `Get-PSDrive`. This is the "find it for me" path for old backups on USB disks, NAS shares, and reception/admin PCs;
- Workstation discovery also scans Start Menu/Desktop/common shortcut roots and can emit safe `workstation-profile:<fingerprint>` hints from `.lnk`/app-name evidence. It can also collect bounded workstation signals from configured hints and, on Windows, filtered process names, service names, uninstall-registry DisplayName values, and shortcut target paths matching known dental DB/imaging profiles; those become `workstation-signal:<fingerprint>` candidates. Both hint types are explicitly labeled as installed/system traces, not data folders: workup/probe can plan the right bridge/export path without pretending that a shortcut, process, service, or installed app record is a patient database;
- If a workstation signal contains an executable, install, service, or shortcut target path, local discovery also derives bounded nearby roots from that path: app folder, sibling/parent data roots, backup/export/storage/DICOM/CBCT/XRay/RVG folders. This lets the admin click "find on this PC" and still surface old data next to installed CRM/imaging software even when the admin did not know the data folder name;
- Workup/probe preserves safe vendor labels for profile hints and adds vendor-specific migration guidance: Romexis/Planmeca, Sidexis/Sirona, Vatech/EzDent, Carestream/Kodak, Morita/i-Dixel, NewTom/NNT/MyRay, Owandy/QuickVision, DEXIS/KaVo/Gendex, Acteon/SOPRO/SOPIX/PSPIX/X-Mind, 1C/1Cv8, Firebird/InterBase, ИНФОДЕНТ/Denta Office, and common legacy MIS profiles get preferred export formats, data-folder cautions, bridge requirements, and the next action an administrator can execute without browsing blindly;
- `POST /api/imports/smart/local-source-workup` turns one discovered source into a safe migration plan: extractable entities, required artifacts, local-bridge/manual steps, DICOM/imaging handoffs, privacy warnings, next action, a `readiness` preflight with `ready_for_preview`, `needs_bridge`, `needs_export`, `manual_review`, or `blocked`, and a `bridgeKit` that tells the admin which export/bridge route, tools, staging manifest, forbidden fields, and doctor control actions are required. The UI renders the plan by alias/fingerprint and does not show raw local paths unless the admin deliberately sends the source into the parser;
- `POST /api/imports/smart/local-source-probe` performs bounded read-only inventory of the selected source: file/header signatures, vendor hints, artifact counts, safe artifact aliases, adapter choice (`DICOM workup`, `document/table extractor`, `legacy DB staging bridge`, or manual manifest), readiness preflight, and the same bridge/export kit. It uses the same DB/DICOM/export-first ordering as discovery, so `maxFiles` does not hide a real legacy database behind generic notes/logs. It does not upload patient files or send local paths to public services;
- `POST /api/imports/smart/migration-autopilot` runs one bounded migration pass: local source discovery, known browser-local manifest candidates, pasted text/Excel/OCR legacy hints, top-candidate probes, optional safe clinic requisites lookup, source scoring, readiness, bridge kit, risk flags, role owners, and blocking/non-blocking next steps. It is the default one-click path for a clinic admin who should not manually hunt through old CRM folders;
- When the admin clicks autoplan from the `Текст, Excel, OCR, диктовка` route, the client sends the pasted smart-import text as an explicit `smartImport` input. Legacy sources recognized there become `smart-preview:*` candidates, keeping the DB/DICOM/export type and clinic requisites in the operator plan while still requiring a real file/folder/export/bridge before staging. The operator packet now names those as `из текста/OCR` in DB/media lanes and first actions, so the admin confirms the actual source instead of mistaking a text hint for a scanned disk;
- Migration autopilot now returns an `operatorPacket`: one compact admin/doctor handoff with overall status, score, old DB/media/table/workstation/browser-manifest totals, clinic public lookup boundary, lane-by-lane readiness, first actions, a role-based `operatorScript`, and a structured `handoffChecklist`. `operatorScript` is the non-technical “what to do now” path: administrator/assistant/doctor steps, button labels, estimates in minutes, source fingerprints, and actions such as discover PC sources, pick folder/disk, open plan, run probe, add to parser, prepare export, build preview, and doctor review. The web client now wires those actions to real buttons: selected browser folders/files immediately build an autoplan, individual source cards can open smart preview in one click, and autoplan source-lines can build smart preview without manual copying. Checklist items identify the owner, phase, required artifact, privacy boundary, and done-when condition for clinic requisites, source access, export/bridge, staging preview, and doctor control. It is deliberately alias/fingerprint based and repeats the online-search boundary: public APIs may receive only clinic INN/ОГРН/КПП/name/address/license, never patients, DICOM, local paths, file names, or legacy DB contents;
- The migration team report uses the current visible discovery/autopilot source set first, then browser-local manifests as fallback. A report downloaded after "find on this PC" therefore describes the same source cards the admin just reviewed instead of silently rebuilding a different browser-only plan;
- The web client also lifts the first useful blocking operator step into a top `Сейчас:` action with the same real button handler as the detailed script, so a clinic admin sees the next migration move before the technical lanes and checklist;
- Guardrail copy in Settings is compact: lookup/privacy boundaries are still available under technical details, but the main migration screen leads with workflow, source cards, and preview actions instead of warning prose;
- The global compliance strip is collapsed into a service details block on heavy admin screens, keeping legal/AI caveats available without pushing migration controls below warning text;
- Settings -> Imports now starts with a migration kickstart panel before the text workbench: find old systems on this PC, choose a folder/disk/archive, build an autoplan from pasted text/table/OCR, or look up clinic requisites. The same handlers are reused, but the admin no longer has to hunt through a flat row of secondary buttons;
- The kickstart panel includes a compact readiness strip for `Источник -> План -> Предпросмотр -> Реквизиты`, derived from current discovery/autopilot/preview/lookup state, so admins see progress without opening technical checklists;
- Migration source cards and operator buttons use clinic-language labels such as `План переноса`, `Проверить источник`, `Предпросмотр`, and human source-kind names instead of raw enum values, `Kit`, `parser`, or English `Preview`;
- The UI also humanizes backend migration route text before display: bridge tools, staging manifests, adapter statuses, required manifest columns, provider states, risk flags, and handoff actions are translated into clinic-operator language while API contracts stay stable;
- Smart import preview uses the same clinic-language source and status labels for legacy sources, and clinic suggestion fields render as readable profile names instead of internal keys;
- Smart import migration-plan statuses and line classifications are rendered through UI label dictionaries, so admins see `готово`, `проверить`, `Пациент`, `Снимок`, and `Источник` instead of internal status/kind values;
- Patient, imaging, and DICOM preview rows show explicit human status labels on each row, not only CSS color/state;
- Local PC discovery in Settings is now also one-step: `Найти на ПК + план` runs bounded source discovery and immediately feeds the result into migration autopilot, so the admin does not need to understand the difference between finding candidates and building the migration route;
- `POST /api/imports/smart/migration-autopilot/report.csv` exports that operator packet as a static-name safe handoff CSV for the clinic migration team. It contains statuses, owners, phases, required artifacts, privacy text, and source fingerprints only; it deliberately omits raw local roots, patient identifiers, DICOM pixels, file names, and legacy DB contents;
- Settings smart parser also supports a browser-local legacy manifest: an admin can choose a disk/folder/files once, and the browser counts old DBs, SQL/1C dumps, tables, archives, DICOM/CBCT/RVG/photo files, dental 3D models, and CRM/vendor-like folder names without uploading file contents or storing raw local paths. The result becomes `browser-local:<fingerprint>` candidates that can be planned, probed as adapter-plans, sent to the parser, or carried into the migration autopilot ranking;
- Browser-local migration scans now use bounded chunked progress with file/folder/signature caps, cooperative yielding, and an operator cancel button before autopilot starts. This keeps weak PCs, phones, and desktop browser shells responsive while scanning old MIS folders without uploading file contents or storing raw local paths;
- `POST /api/imports/smart/clinic-public-lookup` builds a clinic-only public lookup from INN/ОГРН/КПП/name/address/license, returns a sanitized manual suggestion from the entered requisites even when DaData is not configured, optionally calls DaData when `DENTAL_DADATA_API_KEY` or `DADATA_API_KEY` is configured, and strips patient names, patient phones, birth dates, CT/X-ray words, image filenames, imaging paths, and old DB paths before public-search input is prepared;
- Settings renders clinic public lookup, migration autopilot clinic lookup, and smart-import clinic suggestion warnings through a UI-owned operator formatter, so server warning strings remain stable DTO state while admins see field names, service errors, and duplicate requisites as review actions;
- Patient import and smart migration routes now own their request validation copy. Bad payloads return one operator-readable Russian message per route and never expose raw zod `issues`, schema paths, `rawText`, source refs, parser tokens, or local-source field names through the API response;
- Settings exposes migration autopilot, manual discovery/probe/workup, and clinic public lookup from the smart parser, so an admin can prepare migration sources and public requisites without manually hunting through disks or copying patient data into maps/search APIs;
- recognizes `.ima`, `.webp`, TRG/Ceph, Orthanc/dcm4chee, Sidexis, Romexis, OnDemand3D, and Invivo hints in mixed exports;
- routes patient lines through the patient preview pipeline and image lines through the imaging preview pipeline;
- supports modes: `auto`, `mixed`, `patients`, and `imaging`;
- commits patients first and imaging second, so an image row from the same export can attach to a newly created patient;
- still writes only rows that the downstream preview marks `ready`;
- exports a CSV diagnostic report with line classification, confidence, patient preview rows, imaging preview rows, clinic profile suggestions, public lookup actions, legacy-source staging actions, warnings, and parser notes.

Implemented document/table ingestion:
- `POST /api/ingestion/extract`
- accepts text or base64 file payloads and detects ZIP, TXT, CSV, TSV, JSON, XML, HTML, RTF, PDF, DOCX, XLSX, PPTX, ODT, ODS, ODP, image, legacy database, legacy dump, or unknown;
- extracts text locally where possible, including regular ZIP archives and OpenXML/OpenDocument ZIP parsing for DOCX/XLSX/PPTX/ODT/ODS/ODP without native dependencies;
- ZIP ingestion is read-only: nested supported documents/tables become reviewable text, DICOM/image entries become safe manifest references, source/archive entry names are returned only as stable aliases, and nested archives are skipped with warnings;
- PDF extraction is best-effort text only and explicitly warns when OCR/vision is required;
- legacy DB/dump uploads (`.fdb`, `.gdb`, `.mdb`, `.accdb`, `.sqlite`, `.db`, `.dbf`, DBF memo/index companions `.dbt/.fpt/.cdx/.idx`, `.bak`, `.dump`, `.sql`, `.backup`) are not decoded as text; ingestion returns a redacted staging manifest for smart import and requires a local read-only bridge before patient/visit/payment/media extraction;
- returns safe route suggestions for smart import, patient import, imaging manifest, price-list analyzer, or plain-text review;
- returns extraction quality, confidence, suggested target, detected signals, extracted file list, and next action so admins know whether to open preview, review text manually, or run OCR/server image recognition first;
- Settings -> Import exposes this as a file extractor above the manual text area, so admins can load real clinic files into preview without writing anything to the database.
- If the selected route is `pricelist` and the file is an image, the web client preserves the compressed image for the price-list OCR/server image recognition path instead of replacing the working text with an empty placeholder.

Implemented migration commit:
- `POST /api/imports/patients/commit`
- rebuilds the preview server-side before any write;
- imports only `ready` rows;
- skips warnings and blocked rows;
- records an import batch with total/imported/skipped/warning/blocked counts;
- writes audit events for the batch and each imported patient;
- returns imported/skipped counts and imported patient IDs.

Frontend:
- migration studio is moved to Settings, not the doctor's working shift;
- imaging source connectors and imaging manifest import are shown in Settings; patient images are shown in the patient card;
- smart mixed parser is shown in Settings above specialized import tools as the first recommended admin path;
- the user sees counts and row-level warnings before commit;
- confirmed import button writes only safe rows;
- dashboard shows import history and audit events;
- next implementation step is real Postgres-backed import batch storage, file hashing/storage, DICOM metadata extraction, and downloadable import error reports.
