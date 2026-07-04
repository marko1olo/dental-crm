const fs = require('fs');
const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/sampleData.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
`export function getOrCreateImagingViewerSession(studyId: string): ImagingViewerSession {
  const existing = imagingViewerSessions.find((session) => session.studyId === studyId);
  if (existing) return existing;

  const study = imagingStudies.find((candidate) => candidate.id === studyId);
  if (!study) throw new Error("Снимок не найден");`,
`export function getOrCreateImagingViewerSession(study: ImagingStudy): ImagingViewerSession {
  const existing = imagingViewerSessions.find((session) => session.studyId === study.id);
  if (existing) return existing;`
);

code = code.replace(
`export function saveImagingViewerSession(studyId: string, input: SaveImagingViewerSessionRequest): ImagingViewerSession {
  const session = getOrCreateImagingViewerSession(studyId);`,
`export function saveImagingViewerSession(study: ImagingStudy, input: SaveImagingViewerSessionRequest): ImagingViewerSession {
  const session = getOrCreateImagingViewerSession(study);`
);

// We should also add import of ImagingStudy if not there.
if (!code.includes("ImagingStudy") && !code.includes("type ImagingStudy")) {
  code = code.replace(`import type {`, `import type { ImagingStudy, `);
}

fs.writeFileSync(path, code);
console.log('sampleData.ts updated');
