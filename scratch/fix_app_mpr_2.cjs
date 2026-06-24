const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../apps/web/src/App.tsx');
let code = fs.readFileSync(appPath, 'utf8');

// Undo the "as any" and replace with "as MprProjection" and "as MprWindowPreset"
code = code.replace(/mprProjectionLabels\[mprProjection as any\]/g, 'mprProjectionLabels[mprProjection as MprProjection]');
code = code.replace(/mprProjectionOrientationLabels\[mprProjection as any\]/g, 'mprProjectionOrientationLabels[mprProjection as MprProjection]');
code = code.replace(/mprWindowPresetLabels\[mprWindowPreset as any\]/g, 'mprWindowPresetLabels[mprWindowPreset as MprWindowPreset]');

// Also fix: src/App.tsx(5879,23): error TS7006: Parameter 'value' implicitly has an 'any' type.
// I will just let the regex catch it, it's `(value) => setMprSliceIndex` ... wait I tried this before and it didn't catch it because of newlines maybe?
code = code.replace(/\(value\) => setMprSliceIndex/g, '(value: any) => setMprSliceIndex');

// Also fix: src/App.tsx(5879,23): error TS7006: Parameter 'value' implicitly has an 'any' type.
// That is:  const setMprWorkbenchDraftLayout = (value) => {
// Needs to be: const setMprWorkbenchDraftLayout = (value: any) => {
code = code.replace(
  /const setMprWorkbenchDraftLayout = \(value\) => \{/g,
  'const setMprWorkbenchDraftLayout = (value: any) => {'
);

// src/App.tsx(7948,40): error TS7006: Parameter 'current' implicitly has an 'any' type.
// It's probably `(current) => ...`
// Let's replace any `current` with `current: any` inside `setImagingKindFilter`, `setCtPlanningActiveQuickActionId`, etc if they exist.
// Since it's line 7948, it might be something else. Let's do a more robust approach:
// Replace `(current) =>` with `(current: any) =>` everywhere in `App.tsx` that causes an issue.
// Actually, it's probably `setImagingImportSourceKind((current) =>` or something similar.
code = code.replace(/setImagingImportSourceKind\(\(current\) =>/g, 'setImagingImportSourceKind((current: any) =>');
code = code.replace(/setLocalImagingFolderDraft\(\(current\) =>/g, 'setLocalImagingFolderDraft((current: any) =>');
code = code.replace(/setImagingImportPreview\(\(current\) =>/g, 'setImagingImportPreview((current: any) =>');
code = code.replace(/setImagingImportCommit\(\(current\) =>/g, 'setImagingImportCommit((current: any) =>');
code = code.replace(/setBrowserImagingScanProgress\(\(current\) =>/g, 'setBrowserImagingScanProgress((current: any) =>');

fs.writeFileSync(appPath, code, 'utf8');
