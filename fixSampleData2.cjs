const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/sampleData.ts', 'utf8');

const replacement = `export function getOrCreateImagingViewerSession(study: ImagingStudy): ImagingViewerSession {
  const existing = imagingViewerSessions.find((session) => session.studyId === study.id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const session: ImagingViewerSession = {`;

code = code.replace(/export function getOrCreateImagingViewerSession\([^\{]+\{[\s\S]*?const session: ImagingViewerSession = \{/m, replacement);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/sampleData.ts', code);
console.log('sampleData updated');
