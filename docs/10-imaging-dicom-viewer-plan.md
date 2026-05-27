# Imaging and DICOM Viewer Plan

Date: 2026-05-16

## Product Rule

The doctor's default screen needs fast context, not a radiology workstation.

Therefore:
- 2D RVG/OPG/TRG/photo viewing lives in a dedicated Imaging section with compact controls;
- the working Shift screen keeps only image counts, warnings, and a fast entry point;
- DICOM import, watched folders, PACS, and DICOMweb setup stay in Settings;
- CBCT/CT is a dedicated viewer module, not a fake preview.

## Implemented Now

- `ImagingStudyKind` includes `periapical`, `bitewing`, `opg`, `ceph`, `cbct`, `photo`, and `other`.
- Imaging manifest/folder parser recognizes `.dcm`, `.dicom`, `.ima`, `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`, `.bmp`, and `.webp`.
- DICOM manifest parsing also recognizes ZIP/7z/RAR archive paths. ZIP central directories are expanded read-only into virtual `archive.zip::entry.dcm` rows when the archive is available on the server; ZIP64/encrypted/split archives and 7z/RAR are reported as warnings that require extraction or an external worker.
- `POST /api/imaging/dicom/folder-series-preview` now reads local DICOM/IMA files and regular ZIP-contained DICOM entries read-only, extracts header metadata, and turns it into a manifest for the same series/MPR readiness pipeline. It reads bounded header prefixes and does not load/store pixel data.
- `POST /api/imaging/dicom/first-frame-preview` now provides a bounded Settings-only orientation preview for direct uncompressed little-endian MONOCHROME DICOM/IMA files. It skips visually blank readable candidates, falls back to sampled min/max windowing when DICOM WL/WW produces a low-contrast thumbnail, returns a transient PNG data URL, redacts local path context, and rejects compressed/encapsulated, huge, RGB, or ambiguous pixel formats with warnings. The preview card has transient rotate/mirror/invert/zoom/brightness/contrast controls; these controls are not persisted and are not a diagnostic claim.
- Source detection recognizes RVG/sensor bridges, DICOM files, DICOMweb/QIDO/WADO, PACS/Orthanc/dcm4chee, and common dental imaging exporters such as Sidexis, Romexis, DTX, OnDemand3D, Invivo, EzDent, CliniView, DBSWIN, VistaSoft, Weasis, RadiAnt, and OHIF.
- `#imaging` is now a first-class app section. It provides rotate, flip, invert, brightness, contrast, zoom, and reset while keeping Shift light.
- `#imaging` now saves a viewer session per study locally first and then on the API server: 2D image controls, CBCT/MPR projection/window/slab/crosshair intent, and doctor note annotations are recoverable after refresh. Source image pixels are not modified. The viewer save strip now shows local/server timestamps, distinguishes queued/offline/error states, auto-retries when the workstation returns online, and keeps a compact manual retry.
- The Imaging page also shows type filters, patient context, a compact typed viewer plan for the selected study kind, available tools, practical presets, first warning, and next action. CBCT is explicitly routed to the MPR/DICOMweb workbench instead of implying that the flat preview is diagnostic.
- The Imaging page keeps CBCT-only MPR controls behind a collapsed advanced block: quick status and external handoff are visible first; axial/coronal/sagittal/oblique/panoramic projection choice, axis angle, slab thickness, window preset, crosshair, linked planes, and safety notes are available on demand. The panel appears only when the selected study is CBCT.
- Settings -> Sources shows the split between ready 2D viewing, preview-grade DICOM import, and the later CBCT/CT series viewer.
- `POST /api/imaging/dicom/series-preview` groups manifest rows by StudyInstanceUID/SeriesInstanceUID when present, falls back to folder grouping when metadata is missing, and reports file count, modality, patient match, recommended viewer path, and warnings.
- Every DICOM series group now returns `mprReadiness`: volume candidate, minimum slice count, MPR readiness, panoramic reconstruction eligibility, recommended layout, supported projections, tools, blockers, warnings, and next action.
- `mprReadiness` now includes a resource policy: required workstation tier, load strategy, estimated browser memory, max client slice cap, cache mode, thumbnail-first rule, safety caps, and next action. This is the guardrail that keeps weak PCs on preview/external handoff and strong workstations on full MPR.
- Settings -> Sources includes a compact admin CBCT/MPR readiness workbench with axial/coronal/sagittal/oblique/panoramic projection selection, axis-angle intent, slab thickness, window preset, crosshair, linked planes, and external viewer handoff metadata.
- Settings -> Sources and Settings -> Imports expose DICOM series preview as an admin-only check. It does not store raw pixels and does not pretend to be diagnostic MPR.
- `POST /api/imaging/dicomweb/check` safely probes a configured DICOMweb root through QIDO-RS, reports `ready`, `auth_required`, `unreachable`, or `misconfigured`, keeps PACS credentials server-side, and does not mutate PACS state.
- `POST /api/imaging/dicom/viewer-launch-manifest` builds the handoff contract for OHIF, Cornerstone3D, Weasis/RadiAnt, or a configured external viewer: Study/Series UID, DICOMweb roots, resource policy, current viewer state, and annotations.
- `POST /api/imaging/dicom/viewer-tool-state` builds a pixel-free viewer adapter bundle: Cornerstone-style tool group ids, viewport ids, MPR projection/window/slab/crosshair state, tool modes, measurement/note annotations, and OHIF sidecar hints. It never contains DICOM pixel data.
- `POST /api/imaging/dicom/workstation-readiness` turns browser workstation facts into a safe load decision: full MPR, downsampled-first MPR, DICOMweb stream, metadata-only, or external viewer handoff.
- `POST /api/imaging/dicom/render-cache-plan` converts that decision into an execution plan for the future viewer: first visible slice, first scroll window, decode/upload concurrency, worker/offscreen use, resident slice cap, GPU/CPU memory budgets, IndexedDB cache intent, and ordered tasks.
- `POST /api/imaging/dicom/viewer-workbench-manifest` is the preferred compact CT/MPR action: it returns workstation readiness, render-cache plan, viewer launch manifest, and tool-state bundle in one response so Settings can prepare the workbench without forcing an admin through separate technical checks.
- The latest CT/MPR workbench bundle is stored in browser local recovery and can be exported as JSON. This preserves the admin's prepared handoff after refresh while still excluding DICOM pixel data from CRM storage.
- `POST /api/imaging/dicom/workbench-bundles` saves that same pixel-free CT/MPR workbench bundle server-side, and `GET /api/imaging/dicom/workbench-bundles` returns recent bundles for recovery on another browser/workstation. The saved bundle contains metadata, launch intent, cache plan, MPR state, annotations, and warnings, not DICOM pixels; local file paths are redacted and must be reconnected on the workstation before pixel load.
- Settings -> Sources includes a `Reconnect folder` action for server-restored bundles: after Find DICOM or manual folder path selection, it reruns folder workup, matches Study/Series UID when possible, rebuilds the local workbench with current workstation facts, stores local recovery, and saves a redacted server bundle again.
- Settings -> Sources includes one-click `Prepare CT` actions on local DICOM discovery and local organizer candidates. The action runs folder workup, picks the safest series plan, builds the CT/MPR workbench manifest, writes browser recovery, and attempts a redacted server save.
- Settings -> Sources and Settings -> Imports include `First slice` on local DICOM folders/candidates. This is a quick orientation check for admins, not a diagnostic viewer, and the result is never persisted.
- `POST /api/imaging/dicom/folder-workup-plan` is the admin shortcut for local CBCT/DICOM folders: it reads only bounded headers, groups series, applies workstation readiness, builds render-cache plans, and returns `open_mpr`, `downsampled_mpr`, `external_viewer`, or `metadata_only` per series. It never loads pixels and never blocks the doctor workflow.
- `POST /api/imaging/dicom/local-folder-discovery` is the admin shortcut before folder workup: it checks configured roots plus Downloads/Desktop/Documents/Pictures/OneDrive export folders for likely CT/DICOM folders, scores candidates by DICOM magic, DICOMDIR, archives, and dental folder-name hints, and lets Settings select a folder without loading pixels. The UI shows a safe local alias, source label, and fingerprint instead of immediately exposing patient-like folder names.
- `POST /api/imaging/local-organizer/scan-preview` is the broader admin organizer: it scans configured/local roots for CT/DICOM, archive references, and dental CAD/model files (`STL`, `OBJ`, `PLY`, `GLB`, `GLTF`, `3MF`), groups likely case folders, and classifies model roles such as upper/lower arches, bite, crown, bridge, implant guide, aligner, and scan body. It is metadata-only, uses the same safe local alias/fingerprint display, and does not load/store pixels or meshes.
- Settings -> Sources stores the last selected local DICOM/CT folder path only in browser local storage. Browser recovery keys are scoped by clinic organization with legacy fallback, so a shared workstation does not carry the previous clinic's local CT folder, browser-picked folder, DICOM workbench or viewer draft into the next clinic. After refresh, admins see a safe alias/source/fingerprint recovery strip and can clear it; server-side workbench persistence remains redacted and pixel-free.
- Settings -> Sources includes `Pick local CT` for browser-local selection. Chromium-class browsers use `showDirectoryPicker`; other browsers can use a directory/file input fallback. The scan is metadata-only, bounded, reads DICOM magic bytes only for detection, persists no raw folder path, and reports counts for DICOM-like files, archives, dental 3D models, images, and bytes.
- The same readiness response now carries a GPU render plan: detected GPU class, texture strategy, quality mode, downsample factor, target slice batch, estimated GPU memory, OffscreenCanvas/Web Worker usage, interaction budget, and first-paint strategy.
- Settings -> Sources now includes a compact DICOMweb/OHIF handoff panel. It is deliberately admin-only so the doctor does not see PACS plumbing during a normal visit.
- `GET /api/system/local-bridges/readiness` now checks optional local CBCT/DICOM worker, OCR worker, and OHIF viewer health endpoints. The probe is read-only, redacts URLs, blocks public remote hosts by default, and exists to decide whether a workstation can hand off heavy pixel work without loading the normal doctor UI.
- `GET /api/system/local-bridges/use-plans` now turns that readiness into scenario plans for CBCT/MPR and imaging import: local DICOM worker, OHIF/external viewer, metadata-only preview, or manual review. It keeps the doctor path warning-only and prevents the CRM shell from pretending to be a full diagnostic viewer.

## Competitive/Technical References

- OHIF viewer exposes window/level, pan/zoom, reset, rotate, measurement, and DICOMweb data-source patterns: https://docs.ohif.org/user-guide/viewer/toolbar and https://docs.ohif.org/configuration/dataSources/dicom-web
- Cornerstone3D is the likely browser engine for diagnostic-grade web viewing because it handles physical-space viewports, tools, annotations, synchronizers, and stack/volume workflows: https://www.cornerstonejs.org/docs/getting-started/overview
- Cornerstone3D volume/MPR examples define the browser implementation target for synchronized axial/coronal/sagittal viewports and later oblique/volume tools: https://www.cornerstonejs.org/live-examples/volumeviewport3d
- ITK-Wasm and dcmjs are candidate low-level helpers for file/DICOM metadata work before full browser volume loading: https://insightsoftwareconsortium.github.io/ITK-Wasm/ and https://dcmjs-org.github.io/dcmjs/
- Weasis is a useful open-source benchmark for cross-platform DICOM viewing, PACS/DICOMweb integration, image manipulation, MPR, and export workflows: https://weasis.org/en/index.html
- RadiAnt is a useful desktop benchmark for UX expectations around MPR, 3D reconstruction, windowing, zoom, and quick image manipulation: https://www.radiantviewer.com/

## 2026-05-16 Verification Delta

The viewer roadmap is intentionally split into a light chair-side layer and a heavy diagnostic workbench:

- OHIF/DICOMweb confirms the right server boundary: QIDO-style search and WADO-style retrieval belong behind configured data sources; upload/store workflows should be added only when we deliberately build that admin path. Settings should own this connector setup.
- Cornerstone3D confirms the right browser boundary: use stack/volume viewports, tools, synchronizers, and cached volumes for MPR. Do not hand-roll diagnostic-grade slice math in the main CRM screen.
- Dental CBCT expectations from Romexis, Sidexis, DTX, Weasis, and RadiAnt are consistent: real CBCT means axial/coronal/sagittal MPR, oblique planes, window/level, measurements, crosshair, and panoramic reconstruction from a volume. A single PNG/OPG preview is only navigation context.
- For weak laptops, volume loading needs resource caps, downsampled preview, and external viewer handoff. For strong workstations, the same data path can unlock linked MPR, slab/MIP, implant planning overlays, and export snapshots.
- The implemented resource policy follows that split today: metadata first, thumbnail first, bounded slice caps, DICOMweb stream mode for PACS, downsampled MPR for medium stacks, and external handoff for huge archives/volumes until a dedicated volume worker exists.
- The new launch manifest follows the same split: CRM owns metadata, notes, recovery, and warnings; OHIF/Cornerstone/external viewers own pixel loading, stack/volume rendering, and diagnostic tools.
- Workstation readiness keeps weak PCs out of full-volume browser loading by checking WebGL2, IndexedDB, memory/cores, storage quota, network state, and DICOMweb connector readiness before allowing a browser viewer path.
- GPU render planning keeps the first interaction cheap: low/integrated chips use external handoff, stack preview, or heavy downsample; diagnostic workstations can use a single shared 3D texture or bricked textures with worker/offscreen preparation.
- The tool-state bundle closes the next handoff gap: CRM annotations and MPR intent are now exportable as stable JSON for Cornerstone/OHIF/external viewers after they load the real display set. Pixel rendering still stays out of the CRM shell until a dedicated viewer module exists.
- The render-cache plan closes the performance gap before pixel rendering: the browser viewer will know exactly which center/active slice to show first, which range to decode next, when to upload textures, and when to defer panoramic reconstruction so the CRM screen never blocks on a full-volume load.
- The workbench manifest closes the usability gap: one admin action now produces readiness, cache, launch, and tool-state data while preserving the rule that CT pixels stay in a dedicated viewer/workbench.
- Local and server workbench recovery close the "lost setup" gap: if Settings refreshes after a CBCT scan or opens from another browser, the last pixel-free workbench bundle restores and can be downloaded for a local viewer adapter.
- Local bridge readiness closes the workstation-discovery gap before real CBCT pixels: the app can now tell whether this PC has a local DICOM worker or OHIF service available, while weak/uncconfigured PCs continue on metadata preview and external handoff.
- Local bridge use-plans close the operational gap: Settings can now tell an administrator whether a study should stay metadata-only, launch OHIF, or wait for a local DICOM worker, instead of exposing a fake MPR promise to the doctor.
- Folder workup closes the click-path gap for local CBCT imports: one Settings action now produces the same header scan, browser/GPU decision, and cache plan that previously required separate metadata, workstation, and cache checks.

## 2026-05-17 Local DICOM Smoke

Bounded read-only test against a local CBCT/DICOM cases folder:
- route: `POST /api/imaging/dicom/folder-series-preview`;
- scan cap: `maxFiles=32`, recursive, header prefix only, no pixel load;
- result: 32 files found, 29 DICOM headers parsed, one CT series grouped;
- viewer routing: `recommendedViewer=cbct_mpr`, `canOpenMpr=true`, `loadStrategy=mpr_full`, `requiredTier=standard`;
- warnings remained non-blocking; panoramic reconstruction still needs a fuller stack.

This verifies metadata grouping and MPR readiness on real local DICOM files. It does not claim that diagnostic CBCT pixel rendering is implemented inside the CRM shell.

Follow-up bounded workup test uses the same folder through `POST /api/imaging/dicom/folder-workup-plan`. The endpoint returns one CT series plan with workstation readiness, GPU texture strategy, first-paint/cache budget, and a warning-only recommended path. This verifies the decision pipeline around real headers; it still does not render diagnostic pixels.

Follow-up local discovery smoke uses `POST /api/imaging/dicom/local-folder-discovery` against Downloads/Desktop/Documents. With technical folders skipped, discovery scanned 705 folders in about 2 seconds, found 12 CT/DICOM candidates, and avoided the previous max-folder cap. The top candidate then produced a folder workup and a CT/MPR workbench manifest with `doctorBlocking=false`, GPU bricked-texture planning, 7 prepared viewports, and external-viewer guidance when browser-local pixel loading is not the safe path.

Follow-up workbench persistence smoke uses a real local Downloads DICOM folder through folder workup, workbench manifest, and `POST /api/imaging/dicom/workbench-bundles`. The route saved a pixel-free bundle with `readiness=86`, `textureStrategy=bricked_3d_textures`, `launchMode=local_manifest`, `doctorBlocking=false`, and `pixelPolicy=metadata_and_tool_state_only_no_pixels`; `GET /api/imaging/dicom/workbench-bundles` then returned it for recovery. Server storage redacts local DICOM file paths, so restored bundles still require reconnecting the local folder/device before pixel load.

Follow-up UI reconnect smoke opened Settings -> Sources from a server-restored redacted bundle, set a real Downloads DICOM folder, clicked `Reconnect folder`, rebuilt the local workbench, and confirmed `Local source is available for this workstation bundle` on desktop and mobile. Screenshots are saved at `docs/screenshots/dicom-workbench-reconnect-desktop.png` and `docs/screenshots/dicom-workbench-reconnect-mobile-success.png`; mobile width stayed at 390px with no horizontal overflow.

Follow-up local organizer smoke uses `POST /api/imaging/local-organizer/scan-preview` against the same Downloads DICOM cases folder. It scanned 51 folders and returned top CT candidates with 220 and 218 DICOM-like files, `recommendedAction=open_ct_workup`, and zero model confidence when no model files were present. The broader default-root scan stayed bounded at 705 folders and was tightened to filter model-only software/resource/game asset folders, so viewer resources and game GLTF/STL files do not outrank patient CT exports. A synthetic 3D model case with `upper_arch.stl`, `lower_arch.ply`, and `implant_guide.3mf` returned `recommendedAction=review_3d_models`, `modelFiles=3`, and correct upper/lower/implant-guide role classification. This is only organization metadata; real mesh rendering remains a separate local/3D viewer boundary.

## 2026-05-18 One-Click CT Workbench Smoke

Bounded read-only test against the current local Downloads DICOM case folder:
- DICOM discovery scanned 69 folders and returned 11 candidates;
- local organizer scanned 69 folders and returned 11 case candidates;
- selected CT candidate had `recommendedAction=open_ct_workup`, 220 DICOM-like files, and no archive dependency;
- folder workup parsed 627 DICOM headers, grouped 2 series, and recommended `external_viewer` for this heavy local series instead of forcing browser pixel load;
- workbench manifest returned `readinessScore=100`, `gpuClass=discrete_ok`, `textureStrategy=external_viewer`, `qualityMode=external`, 3 viewports, and `doctorBlocking=false`;
- server bundle saved with `pixelPolicy=metadata_and_tool_state_only_no_pixels`; warning strings in the saved bundle and nested manifest were checked for raw local paths and passed;
- mobile Settings/Sources screenshot smoke passed at 390px width with `overflow=0`: `docs/screenshots/dicom-settings-mobile-current.png`;
- mobile Imaging/CBCT smoke passed after pressing the CT action button, opened the CT/MPR route, kept advanced controls collapsed, and stayed at `overflow=0`: `docs/screenshots/imaging-cbct-mobile-current.png`.

This verifies the no-loss CT setup path and PHI-safe server recovery. It still does not claim diagnostic pixel rendering inside the CRM shell; actual CT pixels remain in local folders, DICOMweb, or an external/OHIF/Cornerstone workbench.

## 2026-05-18 First-Frame DICOM Preview Smoke

Bounded read-only test against current local Downloads DICOM cases:
- first tested CT candidate correctly returned `unsupported` for compressed/encapsulated or ambiguous PixelData instead of pretending to render it;
- broader candidate pass found real previewable uncompressed DICOM slices: examples included 16-bit `MONOCHROME2`, Explicit VR Little Endian (`1.2.840.10008.1.2.1`), 468x468 and 600x600 source frames, with PNG preview output;
- UI request cap was raised to `maxFiles=160` so real CT folders with leading compressed/blank files still find a bounded previewable slice;
- the preview selector now skips visually blank readable candidates and uses sampled min/max windowing when file WL/WW makes the thumbnail unusable;
- API response was checked for raw local path leakage and patient/file fields: `responseHasRawLocalPath=false`, no `patientName`, no `filePath`;
- Settings/Sources mobile UI smoke clicked local organizer -> `First slice`, rendered a real non-blank preview image, stayed at 390px width with `overflow=0`, verified the card was not hidden, and saved `docs/screenshots/dicom-first-frame-mobile-current.png`;
- the card states `not stored` and the next action requires the DICOM/MPR workbench for diagnosis.

This closes the "can we see anything from real DICOM?" gap without crossing the boundary into a diagnostic CT viewer. Compressed transfer syntaxes still require OHIF/Cornerstone/desktop DICOM handling.

## 2026-05-18 DICOM UX Hardening Delta

- Settings first-slice preview now has transient rotate, mirror, invert, zoom, brightness, contrast, and reset controls on the preview image. The card says orientation-only/not diagnostic, keeps `not stored`, and still persists no pixels.
- CT workbench actions were renamed around the real user action: `Open CT workbench`, `Check this PC`, `Open in OHIF`, and `Check archive`. Technical export/cache actions moved under `Advanced viewer setup`.
- Visible CT labels were softened from readiness/diagnosis language to `MPR preview ready`, `load readiness`, and `full-res MPR path`; a safety note tells admins to confirm findings in the clinic's certified viewer/workstation policy.
- Mobile Settings/Sources smoke passed at 390px with `overflow=0` and screenshot `docs/screenshots/dicom-settings-actions-mobile-current.png`.
- Local organizer smoke against the current machine returned a bounded DICOM candidate without printing raw paths. First-frame API smoke on that candidate returned `unsupported` without raw path leakage, which is correct for compressed/ambiguous DICOM.
- Imaging viewer save hardening smoke: mobile `#imaging` at 390px and desktop at 1280px both found `.viewer-session-strip`, kept horizontal overflow at 0, and captured `docs/screenshots/imaging-viewer-save-mobile-current.png` plus `docs/screenshots/imaging-viewer-save-desktop-current.png`. Settings DICOM smoke still found `.dicom-mpr-workbench` at 390px with overflow 0.
- Local DICOM discovery privacy smoke: API scan returned safe alias/source/fingerprint fields for candidates, redacted warning text, and no warning-level raw path leakage. UI smoke clicked `Find DICOM`, verified `Local CT candidate #...` plus `local ID ...`, `rawPathLeak=false`, `overflow=0`, and saved `docs/screenshots/local-dicom-discovery-safe-result-mobile-current.png` plus `docs/screenshots/local-dicom-discovery-safe-result-desktop-current.png`.
- Local organizer privacy smoke: API scan returned safe alias/source/fingerprint fields for CT/3D cases. UI smoke clicked `Organize CT/3D`, verified `Local imaging case #...` plus `local ID ...`, `rawPathLeak=false`, `overflow=0`, and saved `docs/screenshots/local-imaging-organizer-safe-result-mobile-current.png`.
- Local folder recovery UI now restores only the admin's current-browser folder selection. It keeps the raw path inside browser local storage, shows only safe alias/source/fingerprint text in the recovery strip, supports `Clear`, and does not change the server redaction boundary.
- Browser-picked local CT smoke injected a PHI-safe browser folder summary, verified `Pick local CT` exists, verified `Browser CT folder #...` metadata appears with DICOM/archive/3D counts, checked `rawPathLeak=false`, `overflow=0`, and saved `docs/screenshots/browser-picked-imaging-folder-mobile-current.png`.
- Browser file-input fallback smoke used synthetic non-PHI files through the real hidden input. It verified one no-extension `DICM` file, one ZIP archive, one dental 3D model, one image, `rawPathLeak=false`, `overflow=0`, and saved `docs/screenshots/browser-file-input-dicom-magic-mobile-current.png`.

## 2026-05-18 Synthetic No-PHI DICOM Workup Smoke

`npm run smoke:dicom-folder-workup` now creates a temporary synthetic CT stack with Explicit VR Little Endian DICOM headers and tiny monochrome pixel frames. It does not read Downloads or any real patient export.

The smoke verifies:
- `folder-series-preview` parses all synthetic slices into one CT/CBCT series;
- `mprReadiness` exposes axial, coronal, sagittal, oblique, and panoramic reconstruction intent with rotate-axis, linked MPR, measurement, and handoff tools;
- `first-frame-preview` returns a transient PNG orientation preview with `folderPath=redacted-local-dicom-folder`;
- a diagnostic-class browser gets `open_mpr` plus metadata, thumbnail-first, linked MPR, and panoramic render-cache tasks;
- a weak/no-WebGL browser gets `external_viewer` handoff without blocking the doctor workflow;
- `viewer-workbench-manifest` remains pixel-free and server `workbench-bundles` persistence redacts local DICOM paths and rejects pixel preview data URLs.

This is the safe regression test for CT plumbing. It proves the decision/cache/persistence contract without touching PHI and without claiming full diagnostic volume rendering inside the CRM shell.

## Next Module Boundary

CBCT/CT viewer work should start only when we add:
- DICOM metadata extractor for files that do not already provide Study/Series UID in manifests;
- local file/ZIP/DICOMDIR ingest worker with PHI-safe audit, file hashing, and resource caps;
- production DICOMweb connector settings with tenant auth, audit, and PHI-safe proxy policy;
- browser viewer using Cornerstone3D or embedded OHIF wired to the launch manifest;
- MPR layout: axial, coronal, sagittal, oblique planes, crosshair, linked slice scroll, window/level presets, slab/MIP, panoramic curve from CBCT, measurements, and export snapshot;
- embedded viewer adapter that consumes the current `/api/imaging/dicom/viewer-tool-state` bundle and applies it after Cornerstone/OHIF resolves the display set;
- cache and memory limits for weak laptops;
- clear "draft aid, not signed diagnosis" boundaries for image AI summaries.

## Non-Goal

Do not implement CBCT by pretending one exported PNG is a volume. A flat preview can help navigation, but it cannot replace DICOM series viewing.
