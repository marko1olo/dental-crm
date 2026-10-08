import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	organizations,
	patients,
	rebookingConversionRules,
	users,
	visits,
} from "../../db/schema.js";
import {
	type RebookingEvent,
	rebookingConversionBodySchema,
} from "./types.js";
import {
	calculateRebookingDeltaMinutes,
	extractCreatedAtFromUuidV7,
	formatDoctorSpecialty,
} from "./utils.js";

/**
 * ====================================================================
 *  ФИЧА #54 / #61 — АЛГОРИТМ 15-МИНУТНОГО ОКНА КОНВЕРСИИ ПОВТОРНОЙ ЗАПИСИ
 *  (Врач vs Администратор, Мандаты 8e, 8n & 8j)
 * ====================================================================
 */
export async function registerRebookingRoutes(app: FastifyInstance) {
	app.get("/api/analytics/rebooking-conversion", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"rebooking conversion analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"rebooking conversion analytics",
		);
		if (!orgId) return;

		try {
			const {
				range = "month",
				startDate: qStartDate,
				endDate: qEndDate,
				period_start: qPeriodStart,
				period_end: qPeriodEnd,
				doctorId: qDoctorId,
				doctor_id: qDoctorIdSnake,
				specialty: qSpecialty,
				isSoloDoctor: qIsSoloDoctor,
			} = request.query as {
				range?: string;
				startDate?: string;
				endDate?: string;
				period_start?: string;
				period_end?: string;
				doctorId?: string;
				doctor_id?: string;
				specialty?: string;
				isSoloDoctor?: string | boolean;
			};

			const targetDoctorId = qDoctorId || qDoctorIdSnake || undefined;
			const targetSpecialty = qSpecialty?.trim() || undefined;

			// Определение соло-режима (Мандат 8n: Solo Doctor & Small Clinic):
			// 1) Явный флаг из query (?isSoloDoctor=true)
			// 2) Режим клиники (solo_doctor | one_chair) из таблицы organizations
			// 3) Количество кабинетов/кресел <= 1 в таблице chairs
			let isSoloDoctor =
				qIsSoloDoctor === true ||
				qIsSoloDoctor === "true" ||
				qIsSoloDoctor === "1";

			if (!isSoloDoctor) {
				const [orgRecord] = await db
					.select({ clinicMode: organizations.clinicMode })
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.limit(1);

				if (
					orgRecord?.clinicMode === "solo_doctor" ||
					orgRecord?.clinicMode === "one_chair"
				) {
					isSoloDoctor = true;
				} else {
					const chairsList = await db
						.select({ id: chairs.id })
						.from(chairs)
						.where(eq(chairs.organizationId, orgId))
						.limit(2);

					if (chairsList.length <= 1) {
						isSoloDoctor = true;
					}
				}
			}

			const now = new Date();
			let startDate: Date | undefined;
			let endDate: Date | undefined;

			if (qStartDate || qPeriodStart) {
				startDate = new Date((qStartDate || qPeriodStart)!);
			}
			if (qEndDate || qPeriodEnd) {
				endDate = new Date((qEndDate || qPeriodEnd)!);
			}

			if (!startDate) {
				if (range === "today") {
					startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
					endDate = endDate || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				} else if (range === "week") {
					const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
					startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
				} else if (range === "month" || range === "last_month") {
					startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
				} else if (range === "quarter" || range === "last_3_months") {
					const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
					startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
				} else if (range === "year" || range === "this_year") {
					startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
				}
			}
			if (!endDate) {
				endDate = now;
			}

			// 1. Загружаем уже зафиксированные правила из таблицы rebooking_conversion_rules
			const storedRules = await db
				.select()
				.from(rebookingConversionRules)
				.where(
					and(
						eq(rebookingConversionRules.organizationId, orgId),
						startDate ? gte(rebookingConversionRules.createdAt, startDate) : undefined,
						endDate ? lte(rebookingConversionRules.createdAt, endDate) : undefined,
					),
				);

			// 2. Загружаем завершённые визиты клиники за указанный период
			const completedVisits = await db
				.select({
					visitId: visits.id,
					patientId: visits.patientId,
					patientName: patients.fullName,
					appointmentId: visits.appointmentId,
					signedAt: visits.signedAt,
					updatedAt: visits.updatedAt,
					createdAt: visits.createdAt,
					doctorUserId: appointments.doctorUserId,
					doctorName: users.fullName,
					doctorRole: users.role,
					doctorSpecialties: users.specialties,
					appointmentStartsAt: appointments.startsAt,
					appointmentEndsAt: appointments.endsAt,
				})
				.from(visits)
				.innerJoin(patients, eq(visits.patientId, patients.id))
				.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
				.leftJoin(users, eq(appointments.doctorUserId, users.id))
				.where(
					and(
						eq(visits.organizationId, orgId),
						or(
							eq(visits.status, "signed"),
							sql`${visits.signedAt} is not null`,
						),
						startDate
							? gte(sql`coalesce(${visits.signedAt}, ${visits.updatedAt}, ${visits.createdAt})`, startDate)
							: undefined,
						endDate
							? lte(sql`coalesce(${visits.signedAt}, ${visits.updatedAt}, ${visits.createdAt})`, endDate)
							: undefined,
						targetDoctorId ? eq(appointments.doctorUserId, targetDoctorId) : undefined,
					),
				);

			// 3. Загружаем все последующие приёмы пациентов для расчёта дельты \Delta t
			const patientIds = Array.from(
				new Set(completedVisits.map((v) => v.patientId).filter(Boolean)),
			);

			const appointmentsPool =
				patientIds.length > 0
					? await db
							.select({
								id: appointments.id,
								patientId: appointments.patientId,
								doctorUserId: appointments.doctorUserId,
								startsAt: appointments.startsAt,
								endsAt: appointments.endsAt,
								status: appointments.status,
								doctorName: users.fullName,
								doctorSpecialties: users.specialties,
							})
							.from(appointments)
							.leftJoin(users, eq(appointments.doctorUserId, users.id))
							.where(
								and(
									eq(appointments.organizationId, orgId),
									inArray(appointments.patientId, patientIds),
									ne(appointments.status, "cancelled"),
								),
							)
					: [];

			// 4. Анализируем завершённые визиты и вычисляем конверсию по окну 15 минут
			const computedEvents: RebookingEvent[] = [];
			const processedApptIds = new Set<string>();

			for (const visit of completedVisits) {
				const completedAt =
					visit.signedAt ?? visit.updatedAt ?? visit.appointmentEndsAt ?? visit.createdAt;

				// Ищем приёмы того же пациента, созданные/начинающиеся после или во время визита
				const patientAppts = appointmentsPool.filter(
					(a) =>
						a.patientId === visit.patientId &&
						a.id !== visit.appointmentId &&
						!processedApptIds.has(a.id),
				);

				// Находим ближайший последующий приём
				let candidateAppt: (typeof appointmentsPool)[0] | null = null;
				let minDeltaMs = Number.POSITIVE_INFINITY;

				for (const appt of patientAppts) {
					const apptCreatedAt =
						extractCreatedAtFromUuidV7(appt.id) ?? appt.startsAt;
					const deltaMs = apptCreatedAt.getTime() - completedAt.getTime();

					// Запись у кресла может быть сделана прямо во время приёма (deltaMs <= 0)
					// либо в течение последующего времени
					if (deltaMs >= -1800000 && deltaMs < minDeltaMs) {
						minDeltaMs = deltaMs;
						candidateAppt = appt;
					}
				}

				if (candidateAppt) {
					processedApptIds.add(candidateAppt.id);
					const apptCreatedAt =
						extractCreatedAtFromUuidV7(candidateAppt.id) ?? candidateAppt.startsAt;
					const { deltaMinutes, creditedRole, attributionReason } =
						calculateRebookingDeltaMinutes(apptCreatedAt, completedAt, isSoloDoctor);

					const doctorName = visit.doctorName || candidateAppt.doctorName || "Врач у кресла";
					const rebookedBy =
						creditedRole === "doctor" ? doctorName : "Администратор / Ресепшен";

					computedEvents.push({
						id: candidateAppt.id,
						patientName: visit.patientName || "Пациент",
						rebookedBy,
						timeDeltaMinutes: deltaMinutes,
						creditedRole,
						appointmentDate: candidateAppt.startsAt.toISOString().slice(0, 10),
						createdAt: apptCreatedAt,
						attributionReason,
						doctorId: visit.doctorUserId ?? candidateAppt.doctorUserId ?? null,
						doctorName,
						specialty: formatDoctorSpecialty(visit.doctorSpecialties ?? candidateAppt.doctorSpecialties),
					});
				}
			}

			// 5. Синхронизируем вычисленные события в таблицу rebooking_conversion_rules (наполнение реальными данными)
			const existingKeys = new Set(
				storedRules.map(
					(r) => `${r.patientName}__${r.appointmentDate}__${r.creditedRole}`,
				),
			);
			const rulesToInsert: Array<typeof rebookingConversionRules.$inferInsert> = [];

			for (const ev of computedEvents) {
				const key = `${ev.patientName}__${ev.appointmentDate}__${ev.creditedRole}`;
				if (!existingKeys.has(key)) {
					existingKeys.add(key);
					rulesToInsert.push({
						organizationId: orgId,
						patientName: ev.patientName,
						rebookedBy: ev.rebookedBy,
						timeDeltaMinutes: ev.timeDeltaMinutes,
						creditedRole: ev.creditedRole,
						appointmentDate: ev.appointmentDate,
						createdAt: ev.createdAt,
					});
				}
			}

			if (rulesToInsert.length > 0) {
				try {
					await db.insert(rebookingConversionRules).values(rulesToInsert);
				} catch (err) {
					request.log.warn({ err }, "Не удалось зафиксировать кэш rebooking_conversion_rules");
				}
			}

			// 6. Объединяем сохранённые и вычисленные записи
			const allRecordsMap = new Map<string, RebookingEvent>();

			for (const rule of storedRules) {
				const key = `${rule.patientName}__${rule.appointmentDate}__${rule.creditedRole}`;
				allRecordsMap.set(key, {
					id: rule.id,
					patientName: rule.patientName,
					rebookedBy: rule.rebookedBy,
					timeDeltaMinutes: rule.timeDeltaMinutes,
					creditedRole: rule.creditedRole === "doctor" ? "doctor" : "administrator",
					appointmentDate: rule.appointmentDate,
					createdAt: rule.createdAt,
					attributionReason:
						rule.creditedRole === "doctor"
							? "chairside_rebooking_under_15m"
							: "frontdesk_rebooking_over_15m",
					doctorName: rule.creditedRole === "doctor" ? rule.rebookedBy : null,
				});
			}

			for (const ev of computedEvents) {
				const key = `${ev.patientName}__${ev.appointmentDate}__${ev.creditedRole}`;
				if (!allRecordsMap.has(key)) {
					allRecordsMap.set(key, ev);
				}
			}

			const allRecords = Array.from(allRecordsMap.values());

			// 7. Агрегируем метрики по сотрудникам (Врачи vs Администраторы)
			const totalCompletedVisits = completedVisits.length;
			let doctorRebookingsCount = 0;
			let adminRebookingsCount = 0;

			// Статистика по врачам
			const doctorsMap = new Map<
				string,
				{
					staffId: string | null;
					staffName: string;
					role: string;
					specialty: string;
					completedVisitsCount: number;
					doctorRebookingsCount: number;
					adminRebookingsCount: number;
				}
			>();

			// Инициализируем врачей из завершённых визитов
			for (const visit of completedVisits) {
				const docId = visit.doctorUserId || "unassigned";
				const docName = visit.doctorName || "Врач без назначения";
				const specialty = formatDoctorSpecialty(visit.doctorSpecialties);

				if (!doctorsMap.has(docId)) {
					doctorsMap.set(docId, {
						staffId: visit.doctorUserId,
						staffName: docName,
						role: "doctor",
						specialty,
						completedVisitsCount: 0,
						doctorRebookingsCount: 0,
						adminRebookingsCount: 0,
					});
				}
				const docStat = doctorsMap.get(docId)!;
				docStat.completedVisitsCount++;
			}

			// Распределяем повторные записи
			for (const rec of allRecords) {
				if (rec.creditedRole === "doctor") {
					doctorRebookingsCount++;
					const docId = rec.doctorId || "unassigned";
					if (doctorsMap.has(docId)) {
						doctorsMap.get(docId)!.doctorRebookingsCount++;
					} else {
						doctorsMap.set(docId, {
							staffId: rec.doctorId ?? null,
							staffName: rec.rebookedBy || rec.doctorName || "Врач у кресла",
							role: "doctor",
							specialty: rec.specialty || "Стоматолог общей практики",
							completedVisitsCount: 0,
							doctorRebookingsCount: 1,
							adminRebookingsCount: 0,
						});
					}
				} else {
					adminRebookingsCount++;
					const docId = rec.doctorId || "unassigned";
					if (doctorsMap.has(docId)) {
						doctorsMap.get(docId)!.adminRebookingsCount++;
					}
				}
			}

			const totalRebookings = doctorRebookingsCount + adminRebookingsCount;

			const doctorConversionRate =
				totalCompletedVisits > 0
					? Math.round((doctorRebookingsCount / totalCompletedVisits) * 1000) / 10
					: 0;

			const adminConversionRate =
				totalCompletedVisits > 0
					? Math.round((adminRebookingsCount / totalCompletedVisits) * 1000) / 10
					: 0;

			const overallConversionRate =
				totalCompletedVisits > 0
					? Math.round((totalRebookings / totalCompletedVisits) * 1000) / 10
					: 0;

			// Формируем список по сотрудникам
			const byStaff = Array.from(doctorsMap.values())
				.filter((d) => !targetSpecialty || d.specialty.toLowerCase().includes(targetSpecialty.toLowerCase()))
				.map((d) => {
					const convRate =
						d.completedVisitsCount > 0
							? Math.round((d.doctorRebookingsCount / d.completedVisitsCount) * 1000) / 10
							: 0;
					return {
						staffId: d.staffId,
						staffName: d.staffName,
						role: "doctor" as "doctor" | "administrator",
						specialty: d.specialty,
						completedVisitsCount: d.completedVisitsCount,
						doctorRebookingsCount: d.doctorRebookingsCount,
						adminRebookingsCount: d.adminRebookingsCount,
						rebookingCount: d.doctorRebookingsCount + d.adminRebookingsCount,
						conversionRate: convRate,
						chairsideRetentionRate: convRate,
						retentionKpiStatus: convRate >= 70 ? ("target_met" as const) : ("needs_improvement" as const),
						targetKpiPercent: 70,
					};
				});

			// Добавляем администраторов отдельной строкой
			byStaff.push({
				staffId: null,
				staffName: "Администратор / Ресепшен",
				role: "administrator" as const,
				specialty: "Регистратура / Колл-центр",
				completedVisitsCount: 0,
				doctorRebookingsCount: 0,
				adminRebookingsCount: adminRebookingsCount,
				rebookingCount: adminRebookingsCount,
				conversionRate: adminConversionRate,
				chairsideRetentionRate: 0,
				retentionKpiStatus: "target_met" as const,
				targetKpiPercent: 70,
			});

			return {
				success: true,
				data: {
					summary: {
						totalCompletedVisits,
						totalVisits: totalCompletedVisits,
						totalRebookings,
						rebookingRate: overallConversionRate,
						doctorRebookingsCount,
						chairsideRebookingsCount: doctorRebookingsCount,
						adminRebookingsCount,
						frontdeskRebookingsCount: adminRebookingsCount,
						doctorConversionRate,
						adminConversionRate,
						overallConversionRate,
						chairsideRetentionRate: doctorConversionRate,
						thresholdMinutes: 15,
						isSoloDoctor,
						isEmpty: totalCompletedVisits === 0 && totalRebookings === 0,
					},
					byStaff,
					byDoctors: byStaff.filter((s) => s.role === "doctor"),
					events: computedEvents.map((e) => ({
						id: e.id,
						patientName: e.patientName,
						rebookedBy: e.rebookedBy,
						timeDeltaMinutes: e.timeDeltaMinutes,
						creditedRole: e.creditedRole,
						appointmentDate: e.appointmentDate,
						createdAt:
							e.createdAt instanceof Date
								? e.createdAt.toISOString()
								: e.createdAt,
						attributionReason: e.attributionReason,
						doctorId: e.doctorId,
						doctorName: e.doctorName,
						specialty: e.specialty,
					})),
					records: allRecords.map((r) => ({
						id: r.id,
						patientName: r.patientName,
						rebookedBy: r.rebookedBy,
						timeDeltaMinutes: r.timeDeltaMinutes,
						creditedRole: r.creditedRole,
						appointmentDate: r.appointmentDate,
						createdAt:
							r.createdAt instanceof Date
								? r.createdAt.toISOString()
								: r.createdAt,
						attributionReason: r.attributionReason,
					})),
					period: {
						startDate: startDate?.toISOString() ?? null,
						endDate: endDate?.toISOString() ?? null,
						range,
					},
				},
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось рассчитать конверсию повторной записи");
			return reply.code(500).send({
				success: false,
				error: "RebookingConversionCalculationFailed",
				message: "Не удалось рассчитать конверсию повторной записи. Повторите позже.",
			});
		}
	});

	/**
	 * POST /api/analytics/rebooking-conversion
	 * Явная фиксация правила конверсии повторной записи в БД.
	 */
	app.post("/api/analytics/rebooking-conversion", async (request, reply) => {
		const mutationAllowed = await requireClinicalMutationAccess(
			request,
			reply,
			"rebooking conversion record",
		);
		if (!mutationAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"rebooking conversion record",
		);
		if (!orgId) return;

		try {
			const parseRes = rebookingConversionBodySchema.safeParse(request.body);
			if (!parseRes.success) {
				return reply.code(400).send({
					success: false,
					error: "InvalidRequestBody",
					message: "Некорректное тело запроса с данными о повторной записи.",
					details: parseRes.error.flatten(),
				});
			}

			const body = parseRes.data;

			const patientName = body.patientName?.trim() || "Пациент";
			const rebookedBy = body.rebookedBy?.trim() || "Сотрудник";
			const appointmentDate =
				body.appointmentDate?.trim() || new Date().toISOString().slice(0, 10);

			let isSoloDoctor = body.isSoloDoctor;
			if (isSoloDoctor === undefined) {
				const [orgRecord] = await db
					.select({ clinicMode: organizations.clinicMode })
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.limit(1);

				if (
					orgRecord?.clinicMode === "solo_doctor" ||
					orgRecord?.clinicMode === "one_chair"
				) {
					isSoloDoctor = true;
				} else {
					const chairsList = await db
						.select({ id: chairs.id })
						.from(chairs)
						.where(eq(chairs.organizationId, orgId))
						.limit(2);

					if (chairsList.length <= 1) {
						isSoloDoctor = true;
					}
				}
			}

			let timeDeltaMinutes = body.timeDeltaMinutes;
			let creditedRole = body.creditedRole;

			if (typeof timeDeltaMinutes !== "number") {
				if (body.createdAt && body.completedAt) {
					const deltaCalc = calculateRebookingDeltaMinutes(
						body.createdAt,
						body.completedAt,
						isSoloDoctor,
					);
					timeDeltaMinutes = deltaCalc.deltaMinutes;
					if (!creditedRole) creditedRole = deltaCalc.creditedRole;
				} else {
					timeDeltaMinutes = 0;
				}
			}

			if (!creditedRole) {
				creditedRole =
					isSoloDoctor || timeDeltaMinutes <= 15 ? "doctor" : "administrator";
			}

			const [inserted] = await db
				.insert(rebookingConversionRules)
				.values({
					organizationId: orgId,
					patientName,
					rebookedBy,
					timeDeltaMinutes,
					creditedRole,
					appointmentDate,
				})
				.returning();

			return reply.code(201).send({
				success: true,
				data: inserted,
				attribution: {
					timeDeltaMinutes,
					creditedRole,
					attributionReason:
						creditedRole === "doctor"
							? "chairside_rebooking_under_15m"
							: "frontdesk_rebooking_over_15m",
				},
			});
		} catch (e) {
			request.log.error({ err: e }, "Не удалось сохранить правило повторной записи");
			return reply.code(500).send({
				success: false,
				error: "RebookingConversionSaveFailed",
				message: "Не удалось сохранить правило повторной записи.",
			});
		}
	});
}
