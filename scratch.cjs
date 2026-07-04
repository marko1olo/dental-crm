const fs = require('fs');
const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
`import {
  createImagingStudy,
  findVisitById,
  getOrCreateImagingViewerSession,
  imagingStudies,
  listDicomWorkbenchBundles,
  patients,
  saveDicomWorkbenchBundle,
  saveImagingViewerSession
} from "../sampleData.js";`,
`import {
  findVisitById,
  getOrCreateImagingViewerSession,
  listDicomWorkbenchBundles,
  patients,
  saveDicomWorkbenchBundle,
  saveImagingViewerSession
} from "../sampleData.js";
import {
  getImagingStudiesForPatient,
  getAllImagingStudies,
  getImagingStudyById,
  createImagingStudyInDb,
  updateImagingStudyAiSummaryInDb,
  getDefaultOrganizationId
} from "../db/imagingQuery.js";
import type { ImagingStudy } from "@dental/shared";`);

code = code.replace(
`function previewSvg(study: (typeof imagingStudies)[number]) {`,
`function previewSvg(study: ImagingStudy) {`
);

code = code.replace(
`  app.get("/api/imaging/studies", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging studies"))) return;
    const { patientId } = request.query as { patientId?: string };
    const studies = patientId ? imagingStudies.filter((study) => study.patientId === patientId) : imagingStudies;
    return studies.map((study) => imagingStudySchema.parse(study));
  });`,
`  app.get("/api/imaging/studies", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging studies"))) return;
    const { patientId } = request.query as { patientId?: string };
    const orgId = await getDefaultOrganizationId();
    if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
    const studies = patientId ? await getImagingStudiesForPatient(orgId, patientId) : await getAllImagingStudies(orgId);
    return studies.map((study) => imagingStudySchema.parse(study));
  });`
);

code = code.replace(
`  app.get("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging viewer session read"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) return sendImagingStudyNotFound(reply);
    const session = getOrCreateImagingViewerSession(id);
    return imagingViewerSessionResponseSchema.parse({
      session,
      warnings: session.warnings
    });
  });`,
`  app.get("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging viewer session read"))) return;
    const { id } = request.params as { id: string };
    const orgId = await getDefaultOrganizationId();
    if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
    const study = await getImagingStudyById(orgId, id);
    if (!study) return sendImagingStudyNotFound(reply);
    const session = getOrCreateImagingViewerSession(study);
    return imagingViewerSessionResponseSchema.parse({
      session,
      warnings: session.warnings
    });
  });`
);

code = code.replace(
`  app.put("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging viewer session save"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) return sendImagingStudyNotFound(reply);
    const parsed = parseImagingPayload(
      saveImagingViewerSessionRequestSchema,
      request.body,
      "Ошибка валидации запроса на сохранение: данные не соответствуют ожидаемой схеме."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    const session = saveImagingViewerSession(id, input);
    return reply.code(200).send(
      imagingViewerSessionResponseSchema.parse({
        session,
        warnings: session.warnings
      })
    );
  });`,
`  app.put("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging viewer session save"))) return;
    const { id } = request.params as { id: string };
    const orgId = await getDefaultOrganizationId();
    if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
    const study = await getImagingStudyById(orgId, id);
    if (!study) return sendImagingStudyNotFound(reply);
    const parsed = parseImagingPayload(
      saveImagingViewerSessionRequestSchema,
      request.body,
      "Ошибка валидации запроса на сохранение: данные не соответствуют ожидаемой схеме."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    const session = saveImagingViewerSession(study, input);
    return reply.code(200).send(
      imagingViewerSessionResponseSchema.parse({
        session,
        warnings: session.warnings
      })
    );
  });`
);

code = code.replace(
`  app.post("/api/imaging/studies", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging study create"))) return;
    const parsed = parseImagingPayload(
      createImagingStudySchema,
      request.body,
      "Ошибка валидации: неверный формат, либо пустые поля."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    const patient = patients.find((candidate) => candidate.id === input.patientId);
    if (!patient) {
      return sendImagingStudyScopeError(reply, 404, "Пациент для снимка не найден.");
    }
    if (input.visitId) {
      const visit = findVisitById(input.visitId);
      if (!visit) {
        return sendImagingStudyScopeError(reply, 404, "Визит для снимка не найден.");
      }
      if (visit.patientId !== input.patientId) {
        return sendImagingStudyScopeError(reply, 409, "Пациент визита не совпадает с пациентом снимка.");
      }
      if (visit.organizationId !== patient.organizationId) {
        return sendImagingStudyScopeError(reply, 409, "Пациент визита не совпадает с пациентом базы.");
      }
    }
    const study = createImagingStudy({
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
    });
    return reply.code(201).send(imagingStudySchema.parse(study));
  });`,
`  app.post("/api/imaging/studies", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging study create"))) return;
    const orgId = await getDefaultOrganizationId();
    if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
    const parsed = parseImagingPayload(
      createImagingStudySchema,
      request.body,
      "Ошибка валидации: неверный формат, либо пустые поля."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    const patient = patients.find((candidate) => candidate.id === input.patientId);
    if (!patient) {
      return sendImagingStudyScopeError(reply, 404, "Пациент для снимка не найден.");
    }
    if (input.visitId) {
      const visit = findVisitById(input.visitId);
      if (!visit) {
        return sendImagingStudyScopeError(reply, 404, "Визит для снимка не найден.");
      }
      if (visit.patientId !== input.patientId) {
        return sendImagingStudyScopeError(reply, 409, "Пациент визита не совпадает с пациентом снимка.");
      }
      if (visit.organizationId !== patient.organizationId) {
        return sendImagingStudyScopeError(reply, 409, "Пациент визита не совпадает с пациентом базы.");
      }
    }
    const study = await createImagingStudyInDb(orgId, {
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
    });
    return reply.code(201).send(imagingStudySchema.parse(study));
  });`
);

code = code.replace(
`  app.post("/api/imaging/studies/:id/analyze", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging study analyze"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) return sendImagingStudyNotFound(reply);`,
`  app.post("/api/imaging/studies/:id/analyze", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging study analyze"))) return;
    const { id } = request.params as { id: string };
    const orgId = await getDefaultOrganizationId();
    if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
    const study = await getImagingStudyById(orgId, id);
    if (!study) return sendImagingStudyNotFound(reply);`
);

code = code.replace(
`    try {
      const analysisResult = await analyzeImagingStudy(imageBase64);
      // Mutate in-memory study (persists for session)
      (study as any).aiSummary = analysisResult.summary;
      (study as any).aiToothUpdates = analysisResult.toothUpdates;
      return reply.code(200).send({ ok: true, analysisResult });
    } catch (err: any) {`,
`    try {
      const analysisResult = await analyzeImagingStudy(imageBase64);
      // Mutate in DB (we don't persist tooth updates structurally yet in this schema)
      await updateImagingStudyAiSummaryInDb(orgId, id, analysisResult.summary);
      (study as any).aiSummary = analysisResult.summary;
      (study as any).aiToothUpdates = analysisResult.toothUpdates;
      return reply.code(200).send({ ok: true, analysisResult });
    } catch (err: any) {`
);

code = code.replace(
`  app.get("/api/imaging/studies/:id/preview.svg", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging preview"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) {
      return sendImagingStudyNotFound(reply);
    }
    return reply.type("image/svg+xml; charset=utf-8").send(previewSvg(study));
  });`,
`  app.get("/api/imaging/studies/:id/preview.svg", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging preview"))) return;
    const { id } = request.params as { id: string };
    const orgId = await getDefaultOrganizationId();
    if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
    const study = await getImagingStudyById(orgId, id);
    if (!study) {
      return sendImagingStudyNotFound(reply);
    }
    return reply.type("image/svg+xml; charset=utf-8").send(previewSvg(study));
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
      aiSummary: \`Импортировано из \${row.sourceName}. Ждет анализа или врача.\`
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
      aiSummary: \`Импортировано из \${row.sourceName}. Ждет анализа или врача.\`
    });
    createdStudyIds.push(study.id);
  }

  return imagingImportCommitResponseSchema.parse({`
);

fs.writeFileSync(path, code);
console.log('done');
