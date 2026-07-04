const fs = require('fs');

function fixErrors4() {
  const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let code = fs.readFileSync(path, 'utf8');

  // Remove the erroneously inserted block around line 6005
  const badBlock = `
  const createdStudyIds = await Promise.all(readyRows.map(async (row) => {
    const study = await createImagingStudyInDb(orgId, {
      patientId: row.patientId!,
      kind: row.kind!,
      title: row.title ?? kindLabels[row.kind!],
      toothCode: row.toothCode,
      region: row.region,
      sourceKind: row.sourceKind,
      sourceName: row.sourceName,
      storagePath: row.filePath,
      capturedAt: row.capturedAt,
    });
    return study.id;
  }));
`;
  code = code.replace(badBlock, '');

  // Fix the actual map in commitImagingImport
  const targetMap = `  const createdStudyIds = readyRows.map((row) => {
    const study = await createImagingStudyInDb(orgId, {
      patientId: row.patientId!,
      kind: row.kind!,
      title: row.title ?? kindLabels[row.kind!],
      toothCode: row.toothCode,
      region: row.region,
      sourceKind: row.sourceKind,
      sourceName: row.sourceName,
      storagePath: row.filePath,
      capturedAt: row.capturedAt,
    });
    return study.id;
  });`;

  const newMap = `  const createdStudyIds = await Promise.all(readyRows.map(async (row) => {
    const study = await createImagingStudyInDb(orgId, {
      patientId: row.patientId!,
      kind: row.kind!,
      title: row.title ?? kindLabels[row.kind!],
      toothCode: row.toothCode,
      region: row.region,
      sourceKind: row.sourceKind,
      sourceName: row.sourceName,
      storagePath: row.filePath,
      capturedAt: row.capturedAt,
    });
    return study.id;
  }));`;

  code = code.replace(targetMap, newMap);
  fs.writeFileSync(path, code);
  console.log("Fixed TS error 6542.");
}

fixErrors4();
