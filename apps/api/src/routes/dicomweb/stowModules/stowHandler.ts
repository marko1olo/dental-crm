import crypto from "node:crypto";
import { closeSync, openSync, readSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { getRequestIdentity, requireOrganizationId } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { normalizeUid, organizationExists, parseDicomBufferForStow, UUID_SHAPE } from "../../dicomwebHelpers.js";
import { resolveStowBinding } from "./stowBindingHelper.js";
import { persistStowDicomEntities } from "./stowDbStorage.js";
import { streamDicomPayloadToDisk } from "./stowStreamWriter.js";

export async function handleDicomwebStow(
	request: FastifyRequest<{
		Params?: { studyUid?: string };
		Querystring?: { patientId?: string; patient_id?: string; visitId?: string; visit_id?: string; doctorId?: string; doctor_id?: string };
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalMutationAccess(request, reply, "dicom stow store"))) return;
	const organizationId = requireOrganizationId(request, reply);
	if (!organizationId) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	if (!evaluateClinicalAccess(staffRole).hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.dicom.store", role: staffRole,
			message: "Сохранение КТ / DICOM снимка ограничено 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
		});
	}

	if (!UUID_SHAPE.test(organizationId) || !(await organizationExists(organizationId))) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Организация из токена не существует в базе." });
	}

	const tempId = crypto.randomUUID();
	const tempDir = path.resolve(process.cwd(), "uploads", "temp_stow");
	await fs.mkdir(tempDir, { recursive: true });
	const tempFilePath = path.join(tempDir, `stow_${tempId}.dcm`);

	try {
		await streamDicomPayloadToDisk(request, tempFilePath);
	} catch (err) {
		await fs.unlink(tempFilePath).catch(() => {});
		return reply.code(400).send({ error: "InvalidDicomPayload", message: err instanceof Error ? err.message : "Ошибка при чтении потока DICOM." });
	}

	let headerBuf: Buffer;
	try {
		const fd = openSync(tempFilePath, "r");
		headerBuf = Buffer.alloc(131072);
		const bytesRead = readSync(fd, headerBuf, 0, headerBuf.length, 0);
		closeSync(fd);
		headerBuf = headerBuf.subarray(0, bytesRead);
	} catch {
		await fs.unlink(tempFilePath).catch(() => {});
		return reply.code(400).send({ error: "InvalidDicomPayload", message: "Не удалось прочитать заголовок временного файла снимка." });
	}

	if (headerBuf.length < 132) {
		await fs.unlink(tempFilePath).catch(() => {});
		return reply.code(400).send({ error: "InvalidDicomPayload", message: "Тело запроса должно содержать валидный бинарный буфер DICOM (минимум 132 байта с DICM сигнатурой)." });
	}

	const parsed = parseDicomBufferForStow(headerBuf);
	if (!parsed.studyUid || !parsed.seriesUid || !parsed.sopInstanceUid) {
		await fs.unlink(tempFilePath).catch(() => {});
		return reply.code(422).send({ error: "UnprocessableDicomInstance", message: "Файл не содержит обязательных DICOM-тегов идентификации: StudyInstanceUID, SeriesInstanceUID или SOPInstanceUID." });
	}

	const pathStudyUid = request.params?.studyUid ? normalizeUid(request.params.studyUid) : null;
	if (pathStudyUid && pathStudyUid !== parsed.studyUid) {
		await fs.unlink(tempFilePath).catch(() => {});
		return reply.code(409).send({ error: "StudyUidMismatch", message: `StudyInstanceUID в URL (${pathStudyUid}) не совпадает со значением в файле (${parsed.studyUid}).` });
	}

	const explicitPatientId =
		request.query?.patientId ||
		request.query?.patient_id ||
		(typeof request.headers["x-patient-id"] === "string" ? request.headers["x-patient-id"] : undefined) ||
		(typeof request.headers["x-dente-patient-id"] === "string" ? request.headers["x-dente-patient-id"] : undefined) ||
		null;
	const binding = await resolveStowBinding(organizationId, explicitPatientId, parsed);

	const normalizedRelativePath = path.posix.join("uploads", "dicom", organizationId, parsed.studyUid, parsed.seriesUid, `${parsed.sopInstanceUid}.dcm`);
	const permanentDiskPath = path.resolve(process.cwd(), normalizedRelativePath);
	await fs.mkdir(path.dirname(permanentDiskPath), { recursive: true });
	await fs.rename(tempFilePath, permanentDiskPath);

	let fileSizeOnDisk: number | undefined;
	try {
		fileSizeOnDisk = (await fs.stat(permanentDiskPath)).size;
	} catch { /* fallback */ }

	const explicitDoctorId =
		request.query?.doctorId ||
		request.query?.doctor_id ||
		(typeof request.headers["x-doctor-id"] === "string" ? request.headers["x-doctor-id"] : undefined) ||
		identity.userId ||
		null;
	const validDoctorId = explicitDoctorId && UUID_SHAPE.test(explicitDoctorId.trim()) ? explicitDoctorId.trim() : null;
	const explicitVisitId =
		request.query?.visitId ||
		request.query?.visit_id ||
		(typeof request.headers["x-visit-id"] === "string" ? request.headers["x-visit-id"] : undefined) ||
		null;
	const validVisitId = explicitVisitId && UUID_SHAPE.test(explicitVisitId.trim()) ? explicitVisitId.trim() : null;
	const doctorId = validDoctorId ?? identity.userId ?? null;
	const userStaffId = request.user?.staffId;
	const staffId = typeof userStaffId === "string" ? userStaffId : doctorId;
	const operatorLabel = identity.fullName ? ` [${identity.role === "doctor" ? "Врач" : "Сотрудник"}: ${identity.fullName}]` : doctorId ? ` [ID: ${doctorId}]` : "";

	let result: Awaited<ReturnType<typeof persistStowDicomEntities>>;
	try {
		result = await persistStowDicomEntities({
			organizationId,
			parsed: {
				studyUid: parsed.studyUid,
				seriesUid: parsed.seriesUid,
				sopInstanceUid: parsed.sopInstanceUid,
				sopClassUid: parsed.sopClassUid,
				rows: parsed.rows,
				columns: parsed.columns,
				dicomPatientName: parsed.dicomPatientName,
				dicomPatientId: parsed.dicomPatientId,
				dicomBirthDate: parsed.dicomBirthDate,
			},
			resolvedPatientId: binding.resolvedPatientId,
			validDoctorId,
			validVisitId,
			staffId,
			operatorLabel,
			bindingStatus: binding.bindingStatus,
			bindingConfidence: binding.bindingConfidence,
			matchMethod: binding.matchMethod,
			matchDetailsText: binding.matchDetailsText,
			normalizedRelativePath,
			fileSizeOnDisk,
		});
	} catch (dbErr) {
		await fs.unlink(permanentDiskPath).catch(() => {});
		request.log.error(
			{ err: dbErr, permanentDiskPath, studyUid: parsed.studyUid, sopInstanceUid: parsed.sopInstanceUid },
			"Сбой сохранения метаданных DICOM STOW в БД, осиротевший файл удален с диска",
		);
		return reply.code(500).send({
			error: "DicomStoragePersistenceFailed",
			message: "Не удалось сохранить метаданные DICOM снимка в базе данных.",
		});
	}

	await auditMedicalAccessFromRequest(request, {
		organizationId,
		action: "dicom_stow_stored",
		metadata: {
			resource: "imaging_instances",
			resourceId: result.instanceId,
			studyUid: result.studyUid,
			seriesUid: result.seriesUid,
			sopInstanceUid: result.sopInstanceUid,
			patientId: result.patientId ?? undefined,
			doctorId: doctorId ?? undefined,
			staffId: staffId ?? undefined,
			matchMethod: result.matchMethod,
		},
	});

	const sopClassUid = result.sopClassUid || parsed.sopClassUid || "1.2.840.10008.5.1.4.1.1.1";

	return reply.code(200).send({
		"00081199": {
			vr: "SQ",
			Value: [
				{
					"00081150": { vr: "UI", Value: [sopClassUid] },
					"00081155": { vr: "UI", Value: [result.sopInstanceUid] },
					"00081190": {
						vr: "UR",
						Value: [
							`/api/dicomweb/studies/${result.studyUid}/series/${result.seriesUid}/instances/${result.sopInstanceUid}`,
						],
					},
				},
			],
		},
		studyId: result.studyId,
		instanceId: result.instanceId,
		patientId: result.patientId,
		bindingStatus: result.bindingStatus,
		bindingConfidence: result.bindingConfidence,
		matchMethod: result.matchMethod,
		status: "stored",
	});
}
