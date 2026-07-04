const fs = require('fs');
const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
`    const study = createImagingStudy({
      patientId: input.patientId,
      visitId: input.visitId,
      kind: input.kind,
      title: input.title,
      toothCode: input.toothCode,
      region: input.region,
      sourceKind: input.sourceKind,
      sourceName: input.sourceName,
      storagePath: input.storagePath,
      dicomStudyUid: input.dicomStudyUid,
      capturedAt: input.capturedAt,
      aiSummary: input.aiSummary
    });`,
`    const study = await createImagingStudyInDb(orgId, {
      patientId: input.patientId,
      visitId: input.visitId,
      kind: input.kind,
      title: input.title,
      toothCode: input.toothCode,
      region: input.region,
      sourceKind: input.sourceKind,
      sourceName: input.sourceName,
      storagePath: input.storagePath,
      dicomStudyUid: input.dicomStudyUid,
      capturedAt: input.capturedAt,
      aiSummary: input.aiSummary
    });`
);

code = code.replace(
`export async function commitImagingImport(input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const preview = await parseImagingManifest(input);
  const readyRows = preview.rows.filter((row) => row.status === "ready" && row.patientId && row.kind && row.filePath);
  const createdStudyIds = readyRows.map((row) => {
    const study = createImagingStudy({
      patientId: row.patientId!,
      kind: row.kind!,
      title: row.title ?? kindLabels[row.kind!],
      toothCode: row.toothCode,
      region: row.region,
      sourceKind: row.sourceKind,
      sourceName: row.sourceName,
      storagePath: row.filePath,
      capturedAt: row.capturedAt ?? undefined,
      aiSummary: \`Импортировано из \${row.sourceName}. Требует проверки снимка и привязки к ЭМК.\`
    });
    return study.id;
  });

  return imagingImportCommitResponseSchema.parse({`,
`export async function commitImagingImport(input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const orgId = await getDefaultOrganizationId();
  if (!orgId) throw new Error("No default organization found");
  const preview = await parseImagingManifest(input);
  const readyRows = preview.rows.filter((row) => row.status === "ready" && row.patientId && row.kind && row.filePath);
  const createdStudyIds = [];
  for (const row of readyRows) {
    const study = await createImagingStudyInDb(orgId, {
      patientId: row.patientId!,
      kind: row.kind!,
      title: row.title ?? kindLabels[row.kind!],
      toothCode: row.toothCode,
      region: row.region,
      sourceKind: row.sourceKind,
      sourceName: row.sourceName,
      storagePath: row.filePath,
      capturedAt: row.capturedAt ?? undefined,
      aiSummary: \`Импортировано из \${row.sourceName}. Требует проверки снимка и привязки к ЭМК.\`
    });
    createdStudyIds.push(study.id);
  }

  return imagingImportCommitResponseSchema.parse({`
);

fs.writeFileSync(path, code);
console.log('done');
