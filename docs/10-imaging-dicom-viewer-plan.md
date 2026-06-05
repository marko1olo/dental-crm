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
- DICOM folder/manifest parsing also recognizes ZIP/7z/RAR archive paths. ZIP central directories are expanded read-only into virtual `archive.zip::entry.dcm` rows when the archive is available on the server; ZIP64/encrypted/split archives and 7z/RAR are reported as warnings that require extraction or an external worker.
- `POST /api/imaging/dicom/folder-series-preview` now reads local DICOM/IMA files and regular ZIP-contained DICOM entries read-only, extracts header metadata, and turns it into a manifest for the same series/MPR readiness pipeline. It reads bounded header prefixes and does not load/store pixel data.
- `POST /api/imaging/dicom/first-frame-preview` now provides a bounded Settings-only orientation preview for direct uncompressed little-endian MONOCHROME DICOM/IMA files. It skips visually blank readable candidates, falls back to sampled min/max windowing when DICOM WL/WW produces a low-contrast thumbnail, returns a transient PNG data URL, redacts local path context, and rejects compressed/encapsulated, huge, RGB, or ambiguous pixel formats with warnings. The preview card has transient rotate/mirror/invert/zoom/brightness/contrast controls; these controls are not persisted and are not a diagnostic claim.
- Source detection recognizes RVG/sensor bridges, DICOM files, DICOMweb/QIDO/WADO, PACS/Orthanc/dcm4chee, and common dental imaging exporters such as Sidexis, Romexis, DTX, OnDemand3D, Invivo, EzDent, CliniView, DBSWIN, VistaSoft, Weasis, RadiAnt, and OHIF.
- `#imaging` is now a first-class app section. It provides rotate, flip, invert, brightness, contrast, zoom, and reset while keeping Shift light.
- `#imaging` now saves a viewer session per study locally first and then on the API server: 2D image controls, CBCT/MPR projection/window/slab/crosshair intent, and doctor note annotations are recoverable after refresh. Source image pixels are not modified. The viewer save strip now shows local/server timestamps, distinguishes queued/offline/error states, auto-retries when the workstation returns online, and keeps a compact manual retry.
- Imaging study lookup and clinical scope failures now return stable API codes (`ImagingStudyNotFound`, `ImagingStudyScopeError`) plus Russian operator messages. Viewer-session, preview, and study-create failures must not expose `Study not found`, `patientId`, `visitId`, schema/parser terms, or route parameter details.
- The Imaging page also shows type filters, patient context, a compact typed viewer plan for the selected study kind, available tools, practical presets, first warning, and next action. CBCT is explicitly routed to the MPR/DICOMweb workbench instead of implying that the flat preview is diagnostic.
- The Imaging page keeps CBCT-only MPR controls behind a collapsed advanced block: quick status and external handoff are visible first; axial/coronal/sagittal/oblique/panoramic projection choice, axis angle, slab thickness, window preset, crosshair, linked planes, and safety notes are available on demand. The panel appears only when the selected study is CBCT.
- Clinical MPR presets now distinguish exact protocol fit from a safe fallback plane. If a study cannot open the preset's original plane, the UI can use an available substitute for navigation, but the roadmap does not mark the clinical protocol as exact and does not offer a no-op "fit" action.
- Settings -> Sources shows the split between ready 2D viewing, preview-grade DICOM import, and the later CBCT/CT series viewer.
- `POST /api/imaging/dicom/series-preview` groups manifest rows by StudyInstanceUID/SeriesInstanceUID when present, falls back to folder grouping when metadata is missing, and reports file count, modality, patient match, recommended viewer path, and warnings.
- Every DICOM series group now returns `mprReadiness`: volume candidate, minimum slice count, MPR readiness, panoramic reconstruction eligibility, recommended layout, supported projections, tools, blockers, warnings, and next action.
- `mprReadiness` now includes a resource policy: required workstation tier, load strategy, estimated browser memory, max client slice cap, cache mode, thumbnail-first rule, safety caps, and next action. This is the guardrail that keeps weak PCs on preview/external handoff and strong workstations on full MPR.
- Settings -> Sources includes a compact admin CBCT/MPR readiness workbench with axial/coronal/sagittal/oblique/panoramic projection selection, axis-angle intent, slab thickness, window preset, crosshair, linked planes, and external viewer handoff metadata.
- Settings -> Sources and Settings -> Imports expose DICOM series preview as an admin-only check. It does not store raw pixels and does not pretend to be diagnostic MPR.
- `POST /api/imaging/dicomweb/check` safely probes a configured DICOMweb root through QIDO-RS, reports `ready`, `auth_required`, `unreachable`, or `misconfigured`, keeps PACS credentials server-side, and does not mutate PACS state.
- The DICOMweb connector check is a Settings-admin boundary: production requires the clinic settings admin secret, a clinical-only secret does not unlock connector setup, and operator copy does not expose raw header or environment variable names.
- `POST /api/imaging/dicom/viewer-launch-manifest` builds the handoff contract for OHIF, Cornerstone3D, Weasis/RadiAnt, or a configured external viewer: Study/Series UID, DICOMweb roots, resource policy, current viewer state, and annotations.
- `POST /api/imaging/dicom/viewer-tool-state` builds a pixel-free viewer adapter bundle: Cornerstone-style tool group ids, viewport ids, MPR projection/window/slab/crosshair state, tool modes, measurement/note annotations, and OHIF sidecar hints. It never contains DICOM pixel data.
- `POST /api/imaging/dicom/workstation-readiness` turns browser workstation facts into a safe load decision: full MPR, downsampled-first MPR, DICOMweb stream, metadata-only, or external viewer handoff.
- `POST /api/imaging/dicom/render-cache-plan` converts that decision into an execution plan for the future viewer: first visible slice, first scroll window, decode/upload concurrency, worker/offscreen use, resident slice cap, GPU/CPU memory budgets, IndexedDB cache intent, and ordered tasks.
- DICOM series groups now carry Rows, Columns, bit depth, samples-per-pixel, and estimated pixel bytes. Browser/GPU memory estimates are derived from image geometry when available instead of a fixed per-file guess.
- The render-cache plan now exposes interaction phases: external review, first visible slice, interactive navigation, and idle refinement. The viewer contract can paint a usable first slice before full-volume refinement or panoramic work.
- `POST /api/imaging/dicom/viewer-workbench-manifest` is the preferred compact CT/MPR action: it returns workstation readiness, render-cache plan, viewer launch manifest, and tool-state bundle in one response so Settings can prepare the workbench without forcing an admin through separate technical checks.
- The latest CT/MPR workbench bundle is stored in browser local recovery and can be exported as JSON. This preserves the admin's prepared handoff after refresh while still excluding DICOM pixel data from CRM storage.
- `POST /api/imaging/dicom/workbench-bundles` saves that same pixel-free CT/MPR workbench bundle server-side, and `GET /api/imaging/dicom/workbench-bundles` returns recent bundles for recovery on another browser/workstation. The saved bundle contains metadata, launch intent, cache plan, MPR state, annotations, and warnings, not DICOM pixels; local file paths are redacted and must be reconnected on the workstation before pixel load.
- Settings -> Sources includes a `Reconnect folder` action for server-restored bundles: after Find DICOM or manual folder path selection, it reruns folder workup, matches Study/Series UID when possible, rebuilds the local workbench with current workstation facts, stores local recovery, and saves a redacted server bundle again.
- Settings -> Sources includes one-click `Prepare CT` actions on local DICOM discovery and local organizer candidates. The action runs folder workup, picks the safest series plan, builds the CT/MPR workbench manifest, writes browser recovery, and attempts a redacted server save.
- Settings -> Sources and Settings -> Imports include `First slice` on local DICOM folders/candidates. This is a quick orientation check for admins, not a diagnostic viewer, and the result is never persisted.
- `POST /api/imaging/dicom/folder-workup-plan` is the admin shortcut for local CBCT/DICOM folders: it reads only bounded headers, groups series, applies workstation readiness, builds render-cache plans, and returns `open_mpr`, `downsampled_mpr`, `external_viewer`, or `metadata_only` per series. It never loads pixels and never blocks the doctor workflow.
- `POST /api/imaging/dicom/local-folder-discovery` is the admin shortcut before folder workup: it checks configured roots plus Downloads/Desktop/Documents/Pictures/OneDrive export folders for likely CT/DICOM folders, scores candidates by DICOM magic, DICOMDIR, archives, and dental folder-name hints, and lets Settings select a folder without loading pixels. The UI shows a safe local alias, source label, and fingerprint instead of immediately exposing patient-like folder names.
- `POST /api/imaging/local-organizer/scan-preview` is the broader admin organizer: it scans configured/local roots for CT/DICOM, archive references, and dental CAD/model files (`STL`, `OBJ`, `PLY`, `GLB`, `GLTF`, `3MF`), groups likely case folders, and classifies model roles such as upper/lower arches, bite, crown, bridge, implant guide, aligner, scan body, skull surface, maxilla/mandible bone surface, and CT bone surface. It is metadata-only, uses the same safe local alias/fingerprint display, and does not load/store pixels or meshes.
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
- DICOM Image Pixel Module tags Rows `(0028,0010)`, Columns `(0028,0011)`, Samples per Pixel `(0028,0002)`, and Bits Allocated `(0028,0100)` are the correct source for pixel-memory estimates: https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.7.6.3.html
- OffscreenCanvas/Web Workers are the browser-side direction for keeping heavy canvas/render preparation away from the main UI thread when supported: https://developer.mozilla.org/docs/Web/API/OffscreenCanvas
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
- Geometry-derived memory planning closes the first dishonest CT estimate: a 32x32 synthetic slice and a 1024x1024 synthetic stack now produce different CPU/GPU budgets from DICOM pixel metadata, not from file count alone.
- The tool-state bundle closes the next handoff gap: CRM annotations and MPR intent are now exportable as stable JSON for Cornerstone/OHIF/external viewers after they load the real display set. Pixel rendering still stays out of the CRM shell until a dedicated viewer module exists.
- The render-cache plan closes the performance gap before pixel rendering: the browser viewer will know exactly which center/active slice to show first, which range to decode next, when to upload textures, and when to defer panoramic reconstruction so the CRM screen never blocks on a full-volume load.
- Interaction phases close the next performance gap: external review, first paint, active scroll/navigation, and idle refinement are separate decisions so weak hardware does not pay for full refinement before a doctor can orient.
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
- DICOM image geometry is parsed and propagated through rows/groups: rows, columns, bit depth, samples-per-pixel, and estimated pixel bytes;
- `mprReadiness` exposes axial, coronal, sagittal, oblique, and panoramic reconstruction intent with rotate-axis, linked MPR, measurement, and handoff tools;
- CPU/GPU memory estimates scale from pixel geometry; the smoke covers both tiny 32x32 slices and a larger 1024x1024 synthetic stack;
- render-cache interaction phases include first visible slice, interactive navigation, idle refinement, and external review where required by hardware;
- `first-frame-preview` returns a transient PNG orientation preview with `folderPath=redacted-local-dicom-folder`;
- a diagnostic-class browser gets `open_mpr` plus metadata, thumbnail-first, linked MPR, and panoramic render-cache tasks;
- a weak/no-WebGL browser gets `external_viewer` handoff without blocking the doctor workflow;
- `local-organizer/scan-preview` detects CT-derived skull and mandible surface model roles in a synthetic no-PHI case without loading meshes;
- `viewer-workbench-manifest` remains pixel-free and server `workbench-bundles` persistence redacts local DICOM paths and rejects pixel preview data URLs.

This is the safe regression test for CT plumbing. It proves the decision/cache/persistence contract without touching PHI and without claiming full diagnostic volume rendering inside the CRM shell.

## 2026-06-04 ZIP/DICOM and Browser Scan Honesty Delta

- ZIP-contained DICOM metadata preview no longer reads the whole ZIP file just to reach the central directory. The API reads the EOCD tail, then a bounded central-directory range, then a bounded local-entry prefix for each selected DICOM-like entry.
- Unsupported split/multi-disk, ZIP64 sentinel, encrypted, out-of-bounds, and over-limit central-directory cases are reported as warnings instead of being treated as successful CT data.
- Already materialized virtual paths such as `archive.zip::slice.dcm` are not treated as source archives during series grouping. This prevents ZIP-contained slices from being expanded again and inflating CT memory estimates.
- The synthetic no-PHI workup smoke now includes a stored ZIP with six synthetic DICOM slices. The expected grouped series is 54 parsed slices, and geometry-derived pixel bytes stay at `(48 + 6) * rows * columns * bytes`.
- Browser-local CT/3D scan progress now carries elapsed time, processed work units, file/folder caps, and DICOM magic-read caps. Settings shows these values during active browser folder/file selection so phone, PC browser, and desktop shell users can distinguish bounded work from a frozen UI.
- This still does not claim diagnostic CT pixel rendering inside the CRM shell. CT pixels remain in local folders, DICOMweb, OHIF/Cornerstone, or a desktop/local viewer path.

## 2026-06-04 CT ZIP/Surface/Offline Hardening Delta

- Regular ZIP archives are no longer rejected only because the central directory is beyond the old preview-size gate. The runtime smoke now includes a synthetic archive with a large central-directory offset and expects metadata workup to continue through bounded range reads.
- Deflated ZIP DICOM entries now use a bounded streaming prefix inflate for metadata headers. The CRM does not inflate full pixel payloads just to inspect DICOM tags.
- First-frame preview now reads a bounded header prefix, locates PixelData, and then reads only the first-frame range under a pixel cap. Thumbnail orientation stays transient and non-diagnostic.
- Virtual ZIP entry paths such as `archive.zip::slice.dcm` are explicitly metadata/external-only for MPR readiness, runtime profile, render plan, and launch manifest. Browser MPR is not unlocked without a real local pixel source.
- Tool-state bundles for virtual ZIP entries stay stack/metadata-only: no volume viewport ids, no `dicomfile:archive.zip::slice.dcm` pixel references, and volume-only planning tools stay disabled until the ZIP is unpacked or handled by a local/external viewer bridge.
- CT surface models now carry a no-mesh manifest: role, format, size, same-folder CT pairing hint, local-bridge readiness, warnings, and `containsMeshGeometry=false`. Skull/mandible/maxilla/CT bone surfaces route to local 3D modules or external model viewers.
- Implant planning/export packets now state that CRM output is planning parameters only. CAD/STL generation is a lab/local-bridge deliverable, not browser CRM output.
- Server-local CT discovery, organizer, first-frame preview, folder-series preview, folder-workup, DICOMweb check, current-series workbench, launch/tool-state, workstation readiness, render-cache planning, reconnect, and workbench bundle save calls now share a UI stop control and abort signal path.
- Offline CT/MPR workbench durability moved to IndexedDB v4 with required store assertions and connection hygiene, so existing v3 browsers get the CT stores instead of silently falling back to weaker storage.
- Site/mobile/desktop runtime classification now uses explicit client capability facts. `desktop_app` requires a real desktop/local bridge signal; an Electron/Tauri-looking user-agent alone stays a PC-browser route.
- Browser CT file-input scanning no longer materializes the whole `FileList` before applying the scan cap. Directory picker traversal also caps inspected entries per folder, so very large selected folders stay bounded before file reads.
- Render-cache planning no longer reports worker concurrency when Web Workers are unavailable. No-worker clients get `workerCount=0`, decode concurrency 1, main-thread progressive stages, and a warning about reduced background preparation.
- Server-side generic imaging and DICOM folder collectors now use bounded `opendir` traversal with head-index queues, folder caps, and per-folder entry caps. They no longer call `queue.shift()` or materialize each directory through `readdir(...).sort(...)` before scan limits apply.
- The PWA service worker now caches only explicit shell/assets routes and prunes dynamic shell entries. API calls and arbitrary same-origin CT/local outputs are not swept into the offline cache.
- CT implant-fit screening is now scoped to the selected tooth/site when annotation metadata is available. Other-site rulers are excluded from candidate margin ranking, same-site rulers are preferred, and mixed/unscoped evidence stays draft.
- CT export now has a lightweight browser report action: print, text download, and JSON sidecar from the planning packet. The report is metadata/tool-state only and repeats the no-pixel/no-mesh/no-CAD boundary.
- CT local 3D readiness now surfaces CT surface, arch, scan-body, and guide metadata lanes when a local model manifest exists. The CRM still does not load mesh geometry; readiness is for local bridge/external 3D handoff.
- Browser continuity audit now exposes OPFS/file-picker capability and an explicit CT offline storage boundary: metadata-only recovery, IndexedDB v4 state, no diagnostic image payloads, no mesh geometry, no directory handles, no user file paths, and OPFS diagnostic storage disabled.
- CT render planning now exposes typed hardware/runtime policy: memory budget class, continuous hardware quality weight, progressive slice-window cap, and diagnostic pixel policy. Desktop web is capped to planning preview rather than diagnostic-full claims; explicit desktop app bridge can unlock diagnostic policy while still obeying bounded slice windows.
- CT planning export and viewer-bridge packets now carry a frontend runtime truth policy: source mode (`local_offline_available`, `remote_online_required`, or uploaded/server copy), execution lane (metadata, constrained preview, desktop browser planning preview, or desktop-app/external diagnostic review), memory budget class, continuous hardware quality weight, bounded progressive slice window, and diagnostic pixel policy. The packet explicitly contains no diagnostic pixels, no mesh geometry, and no browser-owned heavy geometry.
- Local skull/CT surface model readiness remains metadata-only in the CRM shell. Surface meshes, dental arches, scan bodies, guide models, CAD/STL, and any heavy skull/bone geometry are owned by the local 3D module, external model viewer, or lab workflow; browser recovery stores only role/count/readiness metadata.
- This still does not claim diagnostic CT pixel rendering, mesh loading, segmentation, or CAD/CAM generation inside the CRM shell. The CRM owns metadata, tool state, route plans, redaction, and handoff.

## 2026-05-31 CT Planning Artifact Hardening

- CT planning now merges saved viewer-tool-state annotations with current local viewer annotations, so ОПТГ curves, nerve canal routes, implant axes, ROI contours, volume ROI, density probes, and guide routes can feed geometry, validation, and export before a backend task bundle is regenerated.
- Empty or underdrawn drafts no longer count as completed artifacts: distance and implant/guide routes require 2 points, angle/ROI/volume/ОПТГ/canal curves require 3 points, and density probes require 1 point.
- Geometry counters now count only drawable artifacts with enough points. Derived implant-volume and implant-canal clearance cards are still shown, but they no longer inflate the raw annotation metric count.
- CT handoff export warns when local CT annotations or the selected implant preset are not yet saved into the portable viewer bundle. The admin lane tells the operator to refresh the viewer packet before handing the plan to another workstation, doctor, or lab.
- CT planning now builds a separate ОПТГ/cross-section reconstruction plan from the structural panoramic curve: curve length, workstation quality weight, derived cross-section step, cross-section count, slab width, and mandibular canal route status. This is a route/quality plan only; it does not export pixels and does not replace the certified viewer.
- ОПТГ reconstruction planning now grades curve sampling density. It exposes the largest control-point gap, a continuous workstation-derived spacing target, and a `curve-sampling` card; sparse three-point curves stay draft until the operator adds control points.
- Cross-section planning now exposes uncapped station demand, actual station coverage, coverage percent, and a compact station preview. If the 160-slice safety cap would leave the route under-covered, the plan stays draft and tells the operator to split the route or adjust step in the CT viewer.
- Implant modeling now has a separate calculation plan for the selected type size, axis length, computed apex, safety envelope diameter, and guide sleeve diameter/length. Continuous workstation quality changes only display density; implant and sleeve dimensions stay clinical data, not a quality-tier output.
- Surgical guide readiness now lives in the implant model plan. The lab lane requires a structured guide route, guide sleeve dimensions, implant axis, selected implant, and computed canal clearance of at least 2 mm; a generic guide route alone is only a draft.
- Implant library fit screening now compares universal implant presets against real ruler distances from the viewer. It exposes ridge-width, bone-height, diameter margin, length margin and canal margin, but remains a screening board: the doctor must confirm which ruler is width/height and no automatic clinical implant selection is claimed.
- Implant fit candidates now show bounded decision reasons per size: draft generic-ruler evidence, missing rulers, negative diameter/length margin, missing axis/canal check, or canal clearance below 2 mm. This keeps the library explainable instead of turning a score into an opaque auto-choice.
- The CT handoff panel now carries implant-fit evidence into the transfer package UI: selected size or candidate for review, score, and decision reasons are visible beside the release gate without inflating the export logic chunk.
- CT ruler artifacts now include dedicated ridge-width and bone-height commands. The implant fit board treats generic short/long ruler evidence as draft only; ready state requires typed ruler roles plus the canal safety gate.
- CT annotation semantic roles now live in the shared viewer annotation and exported tool-state contracts. Ridge-width, bone-height and clearance roles survive local drafts, session save, API bundle export, geometry, measurement readiness and implant-fit screening without hiding role tokens in visible notes.
- CT artifact commands now include a signed canal-clearance ruler. It creates `semanticRole: "clearance"` distance drafts, but measurement readiness treats it as control evidence only; the clinical canal check still requires an implant axis plus a mandibular canal route.
- Measurement readiness now has a separate CT map for ruler/angle counts, ROI area, ROI volume, density probes versus saved density values, canal clearance, calibration warnings, and unsaved local artifacts. A density point without a saved CT viewer value stays a draft; the CRM does not invent HU values.
- Contour measurement readiness now exposes total area and total volume values instead of only counters. The visible CT cards say contour area/volume, while internal `area_roi` and `volume_roi` ids remain the portable viewer contract. Volume is labeled as a contour-plus-slab estimate with the slab thickness that produced it; underdrawn contour drafts stay non-counted and do not pretend to be tissue segmentation.
- Saved density probes now expose average/range and a drill-protocol hint. HU thresholds are used only when the CT viewer explicitly marks the value as `HU`; otherwise the panel and warnings label it as viewing units and refuse HU-calibrated protocol claims.
- CT export packets now carry compact clinical facts for implant/sleeve, OPG station coverage, ROI area/volume, density protocol, and canal/guide state. The facts are metadata/tool-state summaries only; they do not claim pixel export, tissue segmentation, or CAD/CAM generation inside the CRM shell.
- CT export UI now has an explicit release gate before handoff: ready plans can be fixed, warning plans stay draft, and blocked plans show the first clinical blocker. Bundle-budget smoke now excludes `ct-planning-export-panel` from the `ct-planning-export` logic regex.
- CT workflow now renders doctor-readable Russian role labels and copy for every clinical phase instead of internal owner ids or mixed English terms. The active phase is marked with `aria-current="step"` for assistive technology.
- CT static planning catalog now lives in `ctPlanningCatalog.ts` and builds as `ct-planning-catalog`. The reusable panel stays in `ct-planning-tools`, which keeps the UI chunk under budget with enough headroom for the next CT viewer layers.
- CT quick actions now declare their linked artifact commands. The active scenario card shows the required structured artifacts, their ready/draft/blocked state, and can create the next draft without forcing the doctor to scroll to the artifact board.
- CT artifact creation resolves quick actions by exact `artifactCommandIds` before falling back to a shared viewer tool. This prevents distance-based commands such as canal clearance from inheriting the wrong ruler scenario.
- CT planning now carries `activeQuickActionId` separately from the shared viewer tool. The UI highlights the exact clinical scenario (ridge ruler, canal, implant library, OPG, etc.) even when several scenarios reuse `measure_distance`.
- Viewer sessions and lightweight DICOM tool-state bundles now persist `activeQuickActionId` with a nullable default, so restored local/server sessions and portable handoff packets can recover the exact CT clinical scenario without relying on shared viewer tool ids.
- DICOM planning task active status now uses `activeQuickActionId` first and only falls back to the shared viewer tool. A canal quick action using a distance-capable viewer tool marks the nerve-canal planning task active instead of the generic ruler task.
- CT workflow keeps `activePhaseId` as the first unfinished blocker, but also carries `selectedPhaseId` from the exact quick action so the board can focus the doctor's current scenario without hiding the true next blocker.
- CT export packets now also carry `activeQuickActionId`, and the handoff panel renders a dedicated current-scenario card. The package shows whether the transferred context is ОПТГ, canal, contour, implant library, density, axis, or guide without deriving it from a shared viewer tool.
- The current-scenario handoff card now also shows readiness of the exact artifacts linked to that scenario. For example, ridge rulers expose width/height readiness, canal exposes canal curve plus clearance ruler, and guide exposes the guide route; drafts and blocked artifacts stay visible instead of being implied by the generic packet status.
- The current-scenario handoff card now grades itself from its own artifact readiness first: any blocked scenario artifact makes the focused handoff blocked, drafts make it warning, and all-ready artifacts stay warning if the wider packet is still blocked by unsaved portable state.
- The current-scenario handoff summary now counts ready, blocked, and draft artifacts in one pass, so the doctor can see whether the selected CT route is blocked or only unfinished without reading every chip.
- CT export packets now carry `activeScenarioSummary` after UI artifact state is attached: focused scenario id/title, tone, total/ready/draft/blocked counts, detail, and next action. The summary logic lives in its own small chunk instead of inflating the visual panel or export builder.
- CT workflow now also consumes `activeScenarioSummary` from the same enriched export packet. The board keeps `activePhaseId` as the first true blocker, but shows a separate current-scenario focus card with the selected route's detail and next action.
- The CT release gate now inspects `activeScenarioSummary` before allowing a ready-looking handoff. A blocked selected scenario blocks release, and a draft selected scenario keeps the packet as draft unless a stronger packet-level blocker is already present.
- `activeScenarioSummary` now carries typed `blockedArtifacts` and `draftArtifacts` lists. Workflow and handoff can show exact unfinished artifact titles from packet metadata without parsing UI chips or localized detail text.
- `activeScenarioSummary` now also carries a typed scenario route: owner, visible owner label, expected deliverable, and confirmation step. The workflow focus and handoff card can tell whether the selected route belongs to the doctor or laboratory without deriving that from UI text.
- `activeScenarioSummary` also carries the selected viewer preset: projection, visible view label, window preset/label, slab thickness, and whether a full volume is required. This lets a portable CT handoff restore the intended OPG, oblique ruler, 3D volume, or implant-library context without guessing from UI copy.
- The selected viewer preset now emits ordered restore commands (`load_volume`/`metadata_only`, projection, window, slab). Workflow and handoff expose the same command string as metadata so external viewers can restore the active CT scenario without scraping visible labels.
- The viewer restore command builder and serializer now live in `ctPlanningViewerRestore.ts` and build as `ct-planning-viewer-restore`, keeping the adapter contract outside the scenario summary chunk.
- CT export packets now carry volume readiness into the viewer bridge manifest. Workflow and handoff show whether the selected scenario can restore a volume, is metadata-only, or is blocked by missing CT volume.
- The viewer bridge contract now also parses serialized restore strings and rejects missing tokens, unsupported projection/window presets, or invalid slab values before an external adapter applies them.
- Valid restore strings now also produce a compact apply plan with ordered volume/metadata, projection, window, and slab steps for external viewer bridges.
- DICOM planning task titles, reasons, and blocker warnings are now route-owned Russian operator copy. Machine fields such as task kind, CRM tool, projection, and output unit remain stable DTO data, but visible packet/workflow text no longer exposes English `Volume stack`, `Panoramic reconstruction`, or implant-library setup wording.
- The viewer bridge now emits a launch payload with adapter target, pixel policy, command string, normalized apply steps, and blocker. Metadata-only routes stay `metadata_only_no_pixels`; real volume routes stay external viewer restores and do not load CT pixels into the CRM shell.
- The viewer bridge launch gate now checks the payload before launch: metadata-only handoffs require projection/window/slab steps, volume restores additionally require the volume step, and blocked routes expose the missing target or packet blocker through machine-readable metadata.
- The viewer bridge also emits a versioned audit record for handoff and future adapters: target, gate status, launch decision, pixel policy, apply-step count, missing-target count, blocker, and exact restore command string.
- Viewer bridge launch payload and gate now live in `ct-planning-viewer-bridge-launch`, separate from the restore/parser/manifest chunk. The restore contract stays focused on validating and normalizing commands; launch policy can grow independently.
- The viewer bridge audit record now lives in its own `ct-planning-viewer-bridge-audit` chunk, leaving the restore/parser/manifest contract with more bundle headroom while preserving the same handoff metadata.
- The viewer bridge now has a single `ct-planning-viewer-bridge-handoff` envelope that composes manifest, launch payload, launch gate, audit record, and a serialized JSON payload. Workflow and handoff cards expose the envelope version and payload through metadata, so OHIF/Cornerstone/local adapters can consume one stable no-pixel contract instead of rebuilding it from scattered fields.
- Viewer bridge labels shown in workflow/handoff cards now say `пакет просмотра`, not `мост просмотра`, while the bridge/audit/data attributes keep machine-readable adapter metadata. Launch blockers are Russian operator guidance; English missing-target strings stay out of visible CT copy.
- Workflow and handoff cards now reuse the bridge handoff `commandString` for legacy `data-viewer-restore` metadata instead of serializing restore commands again in UI chunks. The restore module remains the only serializer owner.
- Workflow and handoff cards now share one `ctPlanningViewerBridgeAttributes` DOM metadata builder in the bridge-handoff chunk. The two panels expose the same `data-viewer-*` contract without duplicating attribute wiring in separate UI chunks.
- The active scenario summary now owns the selected scenario bridge handoff metadata. Workflow and handoff cards read `bridge` from the portable summary instead of rebuilding the same handoff from the viewer preset twice.
- Technical bridge blockers stay in the serialized envelope metadata rather than visible scenario copy; the card shows doctor-readable bridge readiness while adapters can still inspect the full blocker.
- CT planning fallback labels no longer expose raw viewer enum ids when the backend planning task bundle is not available. The snapshot uses a compact Russian "selected CT tool" fallback and the exact quick-action card carries the clinical scenario name.
- CT planning projection labels no longer expose raw `MIP` wording in task cards; dense-structure views are labeled as a density map for clinician-facing UI.
- CT planning package cards no longer expose raw tool-state adapter ids such as `cornerstone3d` or `generic_json`; they map the target to readable viewer/package labels while the machine id stays inside the bundle.
- CT export clinical facts no longer expose the English `handoff` term in the canal/template readiness line; internal handoff ids stay machine metadata only.
- CT implant-fit warnings no longer expose `fallback shortest/longest` wording; visible candidate reasons now call generic rulers a draft selection source.
- CT implant-fit candidate cards no longer show raw `ready/draft/blocked`, `hard gate`, or `viewer` wording. Status ids stay internal while the card renders Russian clinical labels and asks the doctor to confirm in the CT viewer.
- CT measurement, ОПТГ reconstruction, station coverage, and workflow warnings now use clinical Russian wording for viewing units, CT viewer confirmation, and axis/canal checks. Internal adapter fields such as `viewerLabel` remain typed metadata and are not rendered as raw user guidance.
- CT measurement/reconstruction/implant-model copy was compressed without raising budgets: density, station coverage, packet handoff, sleeve and guide-route cards keep the same clinical meaning while freeing aggregate JS gzip headroom. Implant-model cards no longer show `gate`; the lab route states that STL/CAD remains a lab-side deliverable.
- CT artifact/scenario cards now avoid raw artifact, blocked, viewer, and ROI wording in clinician-visible copy. The board renders "Разметки плана", "нужно действие", "Контур площади", and "Контур объема"; source smoke keeps those labels from regressing while internal `ready/draft/blocked` and ROI contract ids stay typed metadata.
- CT planning header, workflow phase details, measurement summary, and active-scenario deliverables now use contour wording instead of visible `ROI`. Internal `area_roi`, `volume_roi`, DICOM ROI tools, geometry fields, and adapter contracts stay unchanged and source-smoke guarded.
- DICOM launch/settings/App/API copy now uses `внешний просмотр` for the operator-facing route and `нужно действие` for blocked labels. Internal `external_viewer`, `blocked`, viewer bridge, launch target, and adapter ids remain stable machine contracts; source smoke forbids the old visible `внешний просмотрщик` wording in the DICOM/CT handoff sources.
- Downloaded browser DICOM tool-state and workbench JSON now redact local file paths before leaving the browser. `seriesRef.firstFilePath`, viewport `referencedImageId`, tool-state annotation `referencedImageId`, launch `viewerUrl`, and warning text are copied into a redacted payload with `redacted-local-dicom-path:<fingerprint>` markers. The in-browser recovery draft still keeps the local source for the same workstation; exported handoff files do not leak `C:\...`, UNC, or `dicomfile:` paths.
- Server-side workbench bundle persistence now also redacts tool-state annotation `referencedImageId` values, matching the viewport redaction path and keeping saved no-pixel bundles free of local DICOM paths.
- Imaging and DICOM API routes now own their request validation copy. Bad payloads for imaging manifests, DICOM series previews, DICOMweb checks, viewer launch/tool-state/workbench packets, local folder discovery, folder previews, workup plans, workbench bundle saves, viewer-session saves, and study creation return one operator-readable Russian message and never expose raw zod `issues`, schema paths, `folderPath`, `rawText`, `series`, `client`, or viewer-state field names through the API response.
- CT geometry now rejects underdrawn drafts at the metric layer too: single-point rulers/axes do not create zero-length measurements, and OPG/canal curves need 3 points before length, route count, or implant-to-canal clearance is calculated.
- DICOM workstation readiness now carries a runtime profile for site/phone/tablet/PC browser/desktop app and online/offline source mode. A phone or tablet stays in card/notes/first-preview/handoff mode; full CT volume work moves to PC browser, desktop app, or external/local viewer.
- Offline local DICOM folders are treated differently from offline remote DICOMweb/PACS sources. Local folders can keep browser/desktop-app planning routes; offline remote archives stay metadata-only until the archive network or a local copy is available.
- Runtime profile warnings are folded into render planning and workstation readiness. Mobile/tablet routes no longer claim full browser MPR, and offline remote archives no longer schedule decode/upload tasks; the cache plan creates metadata-index work only.
- Render-cache planning now emits executable progressive stages, not only descriptive phases. Stages carry bounded slice order, request type, cancel group, prerequisite stage ids, decimation factor, and resident-slice window. This gives a future Cornerstone/OHIF/local adapter one server-owned schedule for seed slices, interleaved low-resolution volume, active scroll window, adjacent window, and idle refinement.
- CT render policy is now visible in Settings and workbench bundles. Operators see memory class, continuous hardware quality weight, progressive slice-window cap, and diagnostic pixel policy instead of only derived memory numbers; browser plans remain marked as planning preview, not diagnostic pixel rendering.
- Local organizer now builds a model-workbench manifest for CT surface models. Skull, maxilla, mandible, and CT bone surface candidates carry role, format, size, load target, same-folder CT pairing hint, warnings, and next action. CRM still does not load mesh geometry into the patient card; CT surface meshes route to a local 3D module or external model viewer.
- Local CT workbench recovery drafts now live in IndexedDB under the offline database. The saved DICOM workbench manifest and per-series MPR view controls migrate from legacy `localStorage`, keep scoped fallbacks for restricted browsers, and do not store CT pixels or mesh geometry in the CRM shell.
- Browser-local CT/folder selection now scans in cancellable, yielding chunks. The browser path reports progress for files, folders, DICOM-like files, archives, 3D models, and bytes; it uses `AbortController` for stop, `scheduler.yield()` when available, and a timer fallback when unavailable. This keeps phone/weak-PC UI responsive while the CRM builds a no-path local summary.
- Server-side local imaging and DICOM folder scans now also run through an abortable yielding route wrapper. Local folder discovery, local organizer, DICOM folder-series preview, first-frame preview, folder-workup plan, and generic folder scan preview create a request-scoped `AbortSignal`, stop when the Fastify request closes, and yield with `node:timers/promises` `setImmediate` while walking folders and parsing bounded headers.
- PWA update recovery now treats the shell as shell-only infrastructure. The service worker uses network-first JS/CSS shell assets, can skip waiting, clears stale shell cache before lazy-route reload recovery, and still keeps `/api/*`, documents, DICOM pixels, and mesh/CAD/STL out of Cache Storage.
- The server CT scan path still keeps the CRM shell metadata-only: it does not decode full volumes, keep CT pixels, or load 3D meshes into the patient card. The next memory-honesty task is replacing whole-ZIP buffering for <=250 MB archives with bounded random reads of EOCD, central directory, and selected DICOM entry prefixes.
- The CRM still does not claim diagnostic pixel rendering inside the shell. These changes harden the planning/handoff contract around real viewer annotations while pixel work remains in OHIF/Cornerstone/external workbench paths.

## 2026-05-31 CT Dynamic Workflow Board

- CT planning now renders a dynamic clinical workflow board from the existing reconstruction, measurement, implant model, validation, and export facts.
- The workflow identifies the first unfinished phase across series, ОПТГ/cross-sections, measurements, implant model, safety, and handoff via `activePhaseId`.
- The board is metadata/tool-state only. It does not claim pixel export, certified ОПТГ reconstruction, tissue segmentation, or HU sampling inside the CRM shell.

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
