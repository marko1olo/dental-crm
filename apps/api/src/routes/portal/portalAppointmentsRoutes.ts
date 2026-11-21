import { createReadStream, existsSync, statSync } from "node:fs";
import { and, desc, eq, gt, lt, ne, notInArray, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	chairs,
	imagingStudies,
	organizations,
	patients,
	users,
	xrayScans,
} from "../../db/schema.js";
import { validateAndResolvePacsLocalFilePath } from "../../services/imaging/localPacsSanitizer.js";
import { DEFAULT_TIMEZONE } from "../publicBooking/types.js";
import {
	intersectWorkingWindows,
	resolveDaySchedule,
	resolveDoctorDaySchedule,
	utcToLocalWallTime,
} from "../publicBooking/slotAvailabilityEngine.js";
import { extractPortalPatient } from "./portalAuthStore.js";
import type {
	BookAppointmentBody,
	CancelAppointmentBody,
} from "./types.js";
import { isValidUuid } from "@dental/shared";

export async function registerPortalAppointmentsRoutes(server: FastifyInstance): Promise<void> {
	// 14. Get Patient X-Rays and Diagnostic Scans (Fast 2D Lightweight Access)
	server.get("/imaging", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const scans = await db
				.select({
					id: xrayScans.id,
					kind: xrayScans.kind,
					toothCode: xrayScans.toothCode,
					imageDataUri: xrayScans.imageDataUri,
					storagePath: xrayScans.storagePath,
					mimeType: xrayScans.mimeType,
					aiSummary: xrayScans.aiSummary,
					notes: xrayScans.notes,
					status: xrayScans.status,
					capturedAt: xrayScans.capturedAt,
				})
				.from(xrayScans)
				.where(
					and(
						eq(xrayScans.organizationId, auth.organizationId),
						eq(xrayScans.patientId, auth.patientId),
					),
				)
				.orderBy(desc(xrayScans.capturedAt));

			return {
				success: true,
				scans: scans.map((s) => ({
					id: s.id,
					studyDateIso: s.capturedAt.toISOString().slice(0, 10),
					modality: s.kind || "rvg",
					modalityLabel:
						s.kind === "optg"
							? "Панорамный снимок ОПТГ"
							: s.kind === "cbct"
								? "3D КТ (2D срез)"
								: "Прицельная визиография RVG",
					toothFdi: s.toothCode ? [s.toothCode] : [],
					effectiveDoseMicrosv:
						s.kind === "optg" ? 15.0 : s.kind === "cbct" ? 45.0 : 3.0,
					imageUrl:
						s.imageDataUri ||
						(s.storagePath
							? `/api/portal/scans/${s.id}/download`
							: ""),
					diagnosticConclusion:
						s.aiSummary || s.notes || "Снимок без патологических изменений",
					capturedAtIso: s.capturedAt.toISOString(),
				})),
			};
		});
	});

	/**
	 * [DEF-PORTAL-01 / SEV-2 FIX] Безопасная отдача снимков из imagingStudies и xrayScans
	 * Поддерживает как base64 data-uri, так и файлы на диске storagePath в песочнице клиники.
	 */
	async function servePatientScan(
		scanId: string,
		auth: { patientId: string; organizationId: string },
		isView: boolean,
		reply: FastifyReply,
	) {
		// 1. Поиск в imagingStudies (КТ, ОПТГ, визиография)
		const [study] = await db
			.select()
			.from(imagingStudies)
			.where(
				and(
					eq(imagingStudies.id, scanId),
					eq(imagingStudies.patientId, auth.patientId),
					eq(imagingStudies.organizationId, auth.organizationId),
				),
			)
			.limit(1);

		if (study?.storagePath) {
			try {
				const resolved = validateAndResolvePacsLocalFilePath(auth.organizationId, study.storagePath);
				if (existsSync(resolved)) {
					const fileStat = statSync(resolved);
					let mime = "application/octet-stream";
					const lower = resolved.toLowerCase();
					if (lower.endsWith(".png")) mime = "image/png";
					else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
					else if (lower.endsWith(".dcm")) mime = "application/dicom";
					else if (lower.endsWith(".heic") || lower.endsWith(".heif")) mime = "image/heic";

					const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : ".bin";
					reply.header("Content-Type", mime);
					reply.header("Content-Length", fileStat.size);
					reply.header(
						"Content-Disposition",
						isView ? `inline; filename="scan-${scanId}${ext}"` : `attachment; filename="scan-${scanId}${ext}"`,
					);
					return reply.send(createReadStream(resolved));
				}
			} catch {
				// Fallback to xrayScans
			}
		}

		// 2. Поиск в xrayScans (прицельные снимки визиографа)
		const [xray] = await db
			.select()
			.from(xrayScans)
			.where(
				and(
					eq(xrayScans.id, scanId),
					eq(xrayScans.patientId, auth.patientId),
					eq(xrayScans.organizationId, auth.organizationId),
				),
			)
			.limit(1);

		if (xray?.imageDataUri) {
			const matches = xray.imageDataUri.match(/^data:([^;]+);base64,(.+)$/);
			if (matches && matches[1] && matches[2]) {
				const buffer = Buffer.from(matches[2], "base64");
				reply.type(matches[1]);
				reply.header(
					"Content-Disposition",
					isView ? `inline; filename="scan-${scanId}"` : `attachment; filename="scan-${scanId}"`,
				);
				return reply.send(buffer);
			}
		}

		if (xray?.storagePath) {
			try {
				const resolved = validateAndResolvePacsLocalFilePath(auth.organizationId, xray.storagePath);
				if (existsSync(resolved)) {
					const fileStat = statSync(resolved);
					const mime = xray.mimeType || "image/png";
					const lower = resolved.toLowerCase();
					const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : ".png";
					reply.header("Content-Type", mime);
					reply.header("Content-Length", fileStat.size);
					reply.header(
						"Content-Disposition",
						isView ? `inline; filename="scan-${scanId}${ext}"` : `attachment; filename="scan-${scanId}${ext}"`,
					);
					return reply.send(createReadStream(resolved));
				}
			} catch {
				// not found
			}
		}

		reply.status(404);
		return { error: "ScanNotFound" };
	}

	// [DEF-PORTAL-01] Скачивание снимка (attachment)
	server.get<{ Params: { scanId: string } }>("/scans/:scanId/download", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const scanId = request.params.scanId?.trim();
		if (!scanId || !isValidUuid(scanId)) {
			reply.status(400);
			return { error: "InvalidScanId" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			return servePatientScan(scanId, auth, false, reply);
		});
	});

	// [DEF-PORTAL-01] Просмотр снимка в браузере (inline)
	server.get<{ Params: { scanId: string } }>("/scans/:scanId/view", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const scanId = request.params.scanId?.trim();
		if (!scanId || !isValidUuid(scanId)) {
			reply.status(400);
			return { error: "InvalidScanId" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			return servePatientScan(scanId, auth, true, reply);
		});
	});

	// 17. Get Patient Appointments (Protected)
	server.get("/appointments", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const list = await db
				.select({
					id: appointments.id,
					doctorUserId: appointments.doctorUserId,
					chairId: appointments.chairId,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
					reason: appointments.reason,
					comment: appointments.comment,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.patientId, auth.patientId),
						eq(appointments.organizationId, auth.organizationId),
					),
				)
				.orderBy(desc(appointments.startsAt));

			return { success: true, appointments: list };
		});
	});

	// 18. Book Appointment with Strict Pessimistic Double-Booking Concurrency Lock (Protected)
	server.post<{
		Body: BookAppointmentBody;
	}>("/appointments", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const rawIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const idempotencyKey = rawIdempotencyKey?.trim();
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			};
		}

		const doctorId =
			typeof request.body?.doctorId === "string" ? request.body.doctorId.trim() : "";
		const startsAtStr =
			typeof request.body?.startsAt === "string" ? request.body.startsAt.trim() : "";
		const endsAtStr =
			typeof request.body?.endsAt === "string" ? request.body.endsAt.trim() : "";
		const reason =
			typeof request.body?.reason === "string"
				? request.body.reason.trim()
				: "Запись через личный кабинет";
		const comment =
			typeof request.body?.comment === "string" ? request.body.comment.trim() : undefined;

		if (!doctorId || !startsAtStr || !endsAtStr) {
			reply.status(400);
			return {
				error: "MissingRequiredFields",
				message: "Укажите врача, время начала и окончания приёма.",
			};
		}

		if (!isValidUuid(doctorId)) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Идентификатор врача должен быть валидным UUID.",
			};
		}

		const startDate = new Date(startsAtStr);
		const endDate = new Date(endsAtStr);
		if (
			Number.isNaN(startDate.getTime()) ||
			Number.isNaN(endDate.getTime()) ||
			endDate <= startDate
		) {
			reply.status(400);
			return {
				error: "InvalidAppointmentTime",
				message: "Некорректное время приёма.",
			};
		}

		// SEV-2: Запрет бронирования в прошлое
		if (startDate.getTime() <= Date.now()) {
			reply.status(400);
			return {
				error: "InvalidAppointmentTime",
				message: "Нельзя записаться на прошедшее время.",
			};
		}

		// SEV-2: Защита от абсурдной длительности приёма
		const durationMs = endDate.getTime() - startDate.getTime();
		if (durationMs < 15 * 60 * 1000 || durationMs > 8 * 60 * 60 * 1000) {
			reply.status(400);
			return {
				error: "InvalidAppointmentTime",
				message: "Длительность приёма должна составлять от 15 минут до 8 часов.",
			};
		}

		return withTenantCtx(auth.organizationId, async () => {
			return db.transaction(async (tx) => {
				// 1. Проверка рабочего графика клиники и врача (Мандат 8a, 8k: исключить запись в 3 ночи)
				const [orgRow] = await tx
					.select({
						clinicSchedule: organizations.clinicSchedule,
					})
					.from(organizations)
					.where(eq(organizations.id, auth.organizationId))
					.limit(1);

				const [doctorRow] = await tx
					.select({
						id: users.id,
						workingHours: users.workingHours,
					})
					.from(users)
					.where(
						and(
							eq(users.id, doctorId),
							eq(users.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				if (!doctorRow) {
					reply.status(404);
					return {
						error: "DoctorNotFound",
						message: "Выбранный врач не найден в этой клинике.",
					};
				}

				const tz =
					(orgRow?.clinicSchedule as { timezone?: string } | null)?.timezone ||
					DEFAULT_TIMEZONE;
				const localStart = utcToLocalWallTime(startDate, tz);
				const localEnd = utcToLocalWallTime(endDate, tz);

				const clinicDaySchedule = resolveDaySchedule(
					orgRow?.clinicSchedule as unknown,
					localStart.weekday,
				);
				if (!clinicDaySchedule.isWorking) {
					reply.status(409);
					return {
						error: "ClinicClosed",
						message: "В этот день клиника не работает. Пожалуйста, выберите другую дату.",
					};
				}

				const doctorWindow = resolveDoctorDaySchedule(
					doctorRow.workingHours,
					localStart.weekday,
					clinicDaySchedule,
				);
				const effectiveWindow = intersectWorkingWindows(
					clinicDaySchedule,
					doctorWindow,
					1,
				);
				if (!effectiveWindow.isWorking) {
					reply.status(409);
					return {
						error: "DoctorNotWorking",
						message: "В этот день выбранный врач не ведёт приём. Пожалуйста, выберите другую дату.",
					};
				}

				const startMinute = localStart.hours * 60 + localStart.minutes;
				const endMinute = localEnd.hours * 60 + localEnd.minutes;
				if (
					startMinute < effectiveWindow.startMinute ||
					endMinute > effectiveWindow.endMinute ||
					endMinute <= startMinute
				) {
					reply.status(409);
					return {
						error: "OutsideWorkingHours",
						message: "Выбранное время находится вне рабочих часов приёма. Пожалуйста, выберите рабочее окно врача.",
					};
				}

				// 2. SEV-2: Автоматическое определение и назначение свободного стоматологического кресла (chairId)
				const activeChairs = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.organizationId, auth.organizationId),
							eq(chairs.isActive, true),
						),
					);

				let selectedChairId: string | null = null;
				if (activeChairs.length > 0) {
					const sortedChairs = [...activeChairs].sort((a, b) =>
						a.id.localeCompare(b.id),
					);
					for (const chair of sortedChairs) {
						const [occupied] = await tx
							.select({ id: appointments.id })
							.from(appointments)
							.where(
								and(
									eq(appointments.organizationId, auth.organizationId),
									eq(appointments.chairId, chair.id),
									lt(appointments.startsAt, endDate),
									gt(appointments.endsAt, startDate),
									notInArray(appointments.status, ["cancelled", "no_show"]),
								),
							)
							.limit(1);

						if (!occupied) {
							selectedChairId = chair.id;
							break;
						}
					}

					if (!selectedChairId) {
						reply.status(409);
						return {
							error: "NoAvailableChairs",
							message: "На выбранное время нет свободных стоматологических кресел. Пожалуйста, выберите другой интервал.",
						};
					}

					// Блокируем выбранное кресло FOR UPDATE в каноническом порядке Chair -> Doctor -> Patient
					await tx
						.select({ id: chairs.id })
						.from(chairs)
						.where(
							and(
								eq(chairs.organizationId, auth.organizationId),
								eq(chairs.id, selectedChairId),
							),
						)
						.limit(1)
						.for("update");
				}

				// 3. Lock Patient row FOR UPDATE
				await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.id, auth.patientId),
							eq(patients.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				// 4. Collision / Overlap check across active appointments
				const resourceMatchConditions = [
					eq(appointments.doctorUserId, doctorId),
					eq(appointments.patientId, auth.patientId),
				];
				if (selectedChairId) {
					resourceMatchConditions.push(eq(appointments.chairId, selectedChairId));
				}

				const overlapping = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, auth.organizationId),
							or(...resourceMatchConditions),
							lt(appointments.startsAt, endDate),
							gt(appointments.endsAt, startDate),
							notInArray(appointments.status, ["cancelled", "no_show"]),
						),
					)
					.limit(1);

				if (overlapping.length > 0) {
					reply.status(409);
					return {
						error: "SlotConflict",
						message:
							"Выбранное время у врача уже занято другой записью. Пожалуйста, выберите другой интервал.",
					};
				}

				// 5. Atomic insertion с гарантированным chairId
				const [created] = await tx
					.insert(appointments)
					.values({
						organizationId: auth.organizationId,
						patientId: auth.patientId,
						doctorUserId: doctorId,
						chairId: selectedChairId,
						status: "planned",
						startsAt: startDate,
						endsAt: endDate,
						reason,
						comment: comment
							? `[Личный кабинет] ${comment}`
							: "Запись через личный кабинет пациента",
					})
					.returning();

				reply.status(201);
				if (idempotencyKey) {
					reply.header("X-Idempotency-Key", idempotencyKey);
				}
				return { success: true, appointment: created };
			});
		});
	});

	// 19. Cancel Patient Appointment (Protected)
	server.patch<{
		Params: { id: string };
		Body: CancelAppointmentBody;
	}>("/appointments/:id/cancel", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const appointmentId = request.params.id?.trim();
		if (!appointmentId || !isValidUuid(appointmentId)) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Идентификатор записи на приём должен быть валидным UUID.",
			};
		}
		const cancelReason =
			typeof request.body?.reason === "string" && request.body.reason.trim()
				? request.body.reason.trim()
				: "Отменено пациентом через личный кабинет";

		return withTenantCtx(auth.organizationId, async () => {
			return db.transaction(async (tx) => {
				const [appRow] = await tx
					.select()
					.from(appointments)
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.patientId, auth.patientId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				if (!appRow) {
					reply.status(404);
					return {
						error: "AppointmentNotFound",
						message: "Запись на приём не найдена.",
					};
				}

				if (appRow.status === "cancelled") {
					return { success: true, appointment: appRow, message: "Запись уже отменена." };
				}

				if (appRow.status === "completed") {
					reply.status(400);
					return {
						error: "CannotCancelCompleted",
						message: "Нельзя отменить уже завершённый приём.",
					};
				}

				const [updated] = await tx
					.update(appointments)
					.set({
						status: "cancelled",
						comment: appRow.comment
							? `${appRow.comment} | [Отмена: ${cancelReason}]`
							: `[Отмена: ${cancelReason}]`,
					})
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.returning();

				return { success: true, appointment: updated };
			});
		});
	});

	// 19.1 Reschedule Patient Appointment (Protected)
	server.patch<{
		Params: { id: string };
		Body: {
			startsAt: string;
			endsAt?: string;
			reason?: string;
		};
	}>("/appointments/:id/reschedule", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const appointmentId = request.params.id?.trim();
		if (!appointmentId || !isValidUuid(appointmentId)) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Идентификатор записи на приём должен быть валидным UUID.",
			};
		}

		const startsAtStr = typeof request.body?.startsAt === "string" ? request.body.startsAt.trim() : "";
		if (!startsAtStr) {
			reply.status(400);
			return {
				error: "MissingRequiredFields",
				message: "Укажите новое время начала приёма.",
			};
		}

		const startDate = new Date(startsAtStr);
		const endsAtStr = typeof request.body?.endsAt === "string" ? request.body.endsAt.trim() : "";
		const endDate = endsAtStr ? new Date(endsAtStr) : new Date(startDate.getTime() + 30 * 60 * 1000);

		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
			reply.status(400);
			return {
				error: "InvalidAppointmentTime",
				message: "Некорректное время приёма.",
			};
		}

		if (startDate.getTime() <= Date.now()) {
			reply.status(400);
			return {
				error: "InvalidAppointmentTime",
				message: "Нельзя перенести запись на прошедшее время.",
			};
		}

		const rescheduleReason =
			typeof request.body?.reason === "string" && request.body.reason.trim()
				? request.body.reason.trim()
				: "Перенос пациентом через личный кабинет";

		return withTenantCtx(auth.organizationId, async () => {
			return db.transaction(async (tx) => {
				const [appRow] = await tx
					.select()
					.from(appointments)
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.patientId, auth.patientId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				if (!appRow) {
					reply.status(404);
					return {
						error: "AppointmentNotFound",
						message: "Запись на приём не найдена.",
					};
				}

				if (appRow.status === "cancelled" || appRow.status === "completed") {
					reply.status(400);
					return {
						error: "CannotReschedule",
						message: "Нельзя перенести отменённую или уже завершённую запись.",
					};
				}

				const collisionConditions = [
					eq(appointments.organizationId, auth.organizationId),
					ne(appointments.id, appointmentId),
					lt(appointments.startsAt, endDate),
					gt(appointments.endsAt, startDate),
					notInArray(appointments.status, ["cancelled", "no_show"]),
				];
				if (appRow.doctorUserId) {
					collisionConditions.push(eq(appointments.doctorUserId, appRow.doctorUserId));
				}

				const [collision] = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(and(...collisionConditions))
					.limit(1);

				if (collision) {
					reply.status(409);
					return {
						error: "SlotConflict",
						message: "Выбранное время у врача уже занято другой записью. Пожалуйста, выберите другое время.",
					};
				}

				const [updated] = await tx
					.update(appointments)
					.set({
						startsAt: startDate,
						endsAt: endDate,
						comment: appRow.comment
							? `${appRow.comment} | [Перенос: ${rescheduleReason}]`
							: `[Перенос: ${rescheduleReason}]`,
					})
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.returning();

				return { success: true, appointment: updated };
			});
		});
	});

	// 20. Get Clinic Doctors for Online Booking (Protected)
	server.get("/doctors", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const list = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, auth.organizationId),
						eq(users.role, "doctor"),
						eq(users.isActive, true),
					),
				)
				.limit(100);

			return { success: true, doctors: list };
		});
	});
}
