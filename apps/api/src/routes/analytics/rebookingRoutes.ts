import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
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
	formatDoctorSpecialty,
} from "./utils.js";
import {
	clinicTimeZone,
	currentMonthPeriod,
} from "../../services/reports/managerReports.js";
import {
	resolvePeriod,
	resolvePeriodBoundary,
} from "../reports/reportsShared.js";

const rebookingQuerySchema = z
	.object({
		range: z.string().trim().min(1).max(32).optional(),
		startDate: z.string().trim().min(1).max(64).optional(),
		endDate: z.string().trim().min(1).max(64).optional(),
		period_start: z.string().trim().min(1).max(64).optional(),
		period_end: z.string().trim().min(1).max(64).optional(),
		doctorId: z.string().trim().min(1).max(64).optional(),
		doctor_id: z.string().trim().min(1).max(64).optional(),
		specialty: z.string().trim().max(120).optional(),
		isSoloDoctor: z.union([z.boolean(), z.enum(["true", "false", "1", "0"])]).optional(),
	})
	.strict();

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

		const queryParse = rebookingQuerySchema.safeParse(request.query ?? {});
		if (!queryParse.success) {
			return reply.code(400).send({
				success: false,
				error: "ValidationError",
				message:
					queryParse.error.issues.map((i) => i.message).join(", ") ||
					"Некорректные параметры запроса конверсии повторной записи.",
			});
		}

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
			} = queryParse.data;

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

			const timeZone = await clinicTimeZone(orgId);
			const now = new Date();
			let startDate: Date | undefined;
			let endDate: Date | undefined;

			const rawStart = qStartDate || qPeriodStart;
			if (rawStart) {
				startDate =
					resolvePeriodBoundary(rawStart, "from", timeZone) ??
					new Date(rawStart);
			}
			const rawEnd = qEndDate || qPeriodEnd;
			if (rawEnd) {
				endDate =
					resolvePeriodBoundary(rawEnd, "to", timeZone) ?? new Date(rawEnd);
			}

			if (!startDate) {
				let mappedPeriod: "day" | "week" | "month" | "quarter" | "year" | undefined;
				if (range === "today") mappedPeriod = "day";
				else if (range === "week") mappedPeriod = "week";
				else if (range === "month") mappedPeriod = "month";
				else if (range === "quarter" || range === "last_3_months")
					mappedPeriod = "quarter";
				else if (range === "year" || range === "this_year")
					mappedPeriod = "year";

				if (mappedPeriod) {
					const periodRes = resolvePeriod({ period: mappedPeriod }, timeZone);
					if (periodRes.ok) {
						startDate = periodRes.from;
						if (!endDate) {
							endDate = range === "today" ? periodRes.to : now;
						}
					}
				} else if (range === "last_month") {
					const prevMonthDate = new Date(
						now.getFullYear(),
						now.getMonth() - 1,
						15,
					);
					const prevMonth = currentMonthPeriod(prevMonthDate, timeZone);
					startDate = prevMonth.from;
					if (!endDate) {
						endDate = prevMonth.to;
					}
				}
			}
			if (!endDate) {
				endDate = now;
			}

			const { storedRules, completedVisits, appointmentsPool, soloResolved } =
				await withTenantCtx(orgId, async (tx) => {
					let soloFlag = isSoloDoctor;
					if (!soloFlag) {
						const [orgRecord] = await tx
							.select({ clinicMode: organizations.clinicMode })
							.from(organizations)
							.where(eq(organizations.id, orgId))
							.limit(1);

						if (
							orgRecord?.clinicMode === "solo_doctor" ||
							orgRecord?.clinicMode === "one_chair"
						) {
							soloFlag = true;
						} else {
							const chairsList = await tx
								.select({ id: chairs.id })
								.from(chairs)
								.where(eq(chairs.organizationId, orgId))
								.limit(2);

							if (chairsList.length <= 1) {
								soloFlag = true;
							}
						}
					}

					// 1. Загружаем уже зафиксированные правила из таблицы rebooking_conversion_rules
					const rulesRows = await tx
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
					const visitsRows = await tx
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
						.innerJoin(patients, and(eq(visits.patientId, patients.id), eq(patients.organizationId, orgId)))
						.leftJoin(appointments, and(eq(visits.appointmentId, appointments.id), eq(appointments.organizationId, orgId)))
						.leftJoin(users, and(eq(appointments.doctorUserId, users.id), eq(users.organizationId, orgId)))
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
						new Set(visitsRows.map((v) => v.patientId).filter(Boolean)),
					);

					const apptsRows =
						patientIds.length > 0
							? await tx
									.select({
										id: appointments.id,
										patientId: appointments.patientId,
										doctorUserId: appointments.doctorUserId,
										startsAt: appointments.startsAt,
										endsAt: appointments.endsAt,
										status: appointments.status,
										createdAt: appointments.createdAt,
										rebookingSourceVisitId: appointments.rebookingSourceVisitId,
										rebookingDeltaMinutes: appointments.rebookingDeltaMinutes,
										attributedRole: appointments.attributedRole,
										attributedUserId: appointments.attributedUserId,
										attributionReason: appointments.attributionReason,
										doctorName: users.fullName,
										doctorSpecialties: users.specialties,
									})
									.from(appointments)
									.leftJoin(users, and(eq(appointments.doctorUserId, users.id), eq(users.organizationId, orgId)))
									.where(
										and(
											eq(appointments.organizationId, orgId),
											inArray(appointments.patientId, patientIds),
											ne(appointments.status, "cancelled"),
										),
									)
							: [];

					return {
						storedRules: rulesRows,
						completedVisits: visitsRows,
						appointmentsPool: apptsRows,
						soloResolved: soloFlag,
					};
				});
			isSoloDoctor = soloResolved;

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
					// Честное поле createdAt из таблицы appointments без синтаксического анализа UUIDv7
					const apptCreatedAt = appt.createdAt ?? appt.startsAt;
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
					const apptCreatedAt = candidateAppt.createdAt ?? candidateAppt.startsAt;
					
					// Используем персистентно сохраненную атрибуцию из БД, если она есть
					let deltaMinutes: number;
					let creditedRole: "doctor" | "administrator";
					let attributionReason: string;

					if (candidateAppt.attributedRole) {
						creditedRole =
							candidateAppt.attributedRole === "doctor"
								? "doctor"
								: "administrator";
						deltaMinutes =
							candidateAppt.rebookingDeltaMinutes ??
							Math.max(0, Math.floor((apptCreatedAt.getTime() - completedAt.getTime()) / 60000));
						attributionReason =
							candidateAppt.attributionReason ??
							(creditedRole === "doctor"
								? "chairside_rebooking_under_15m"
								: "frontdesk_rebooking_over_15m");
					} else {
						const calc = calculateRebookingDeltaMinutes(apptCreatedAt, completedAt, isSoloDoctor);
						deltaMinutes = calc.deltaMinutes;
						creditedRole = calc.creditedRole;
						attributionReason = calc.attributionReason;
					}

					const doctorName = visit.doctorName || candidateAppt.doctorName || "Врач у кресла";
					const rebookedBy =
						creditedRole === "doctor" ? doctorName : "Администратор / Ресепшен";

					computedEvents.push({
						id: candidateAppt.id,
						visitId: visit.visitId,
						candidateAppointmentId: candidateAppt.id,
						patientName: visit.patientName || "Пациент",
						rebookedBy,
						timeDeltaMinutes: deltaMinutes,
						creditedRole,
						appointmentDate: candidateAppt.startsAt.toISOString().slice(0, 10),
						createdAt: apptCreatedAt,
						attributionReason,
						doctorId: candidateAppt.attributedUserId ?? visit.doctorUserId ?? candidateAppt.doctorUserId ?? null,
						doctorName,
						specialty: formatDoctorSpecialty(visit.doctorSpecialties ?? candidateAppt.doctorSpecialties),
					});
				}
			}

			// 5. [ANL-03] GET-эндпоинт строго Read-Only:
			// Побочные DB-мутации (insert/update) исключены для обеспечения абсолютной идемпотентности чтения.
			// Фиксация правил осуществляется строго через явный POST /api/analytics/rebooking-conversion.

			// 6. Объединяем сохранённые и вычисленные записи
			// [DEF-2.6] Дедупликация строго по реляционным ID (`${visit.id}__${candidateAppt.id}`), исключающая коллизии однофамильцев
			const allRecordsMap = new Map<string, RebookingEvent>();

			for (const rule of storedRules) {
				const key = `rule_${rule.id}`;
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
				const key =
					ev.visitId && ev.candidateAppointmentId
						? `${ev.visitId}__${ev.candidateAppointmentId}`
						: `ev_${ev.id}`;
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
				const docStat = doctorsMap.get(docId);
				if (docStat) {
					docStat.completedVisitsCount++;
				}
			}

			// Распределяем повторные записи
			for (const rec of allRecords) {
				if (rec.creditedRole === "doctor") {
					doctorRebookingsCount++;
					const docId = rec.doctorId || "unassigned";
					const docStat = doctorsMap.get(docId);
					if (docStat) {
						docStat.doctorRebookingsCount++;
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
					const docStat = doctorsMap.get(docId);
					if (docStat) {
						docStat.adminRebookingsCount++;
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

			const txResult = await withTenantCtx(orgId, async (tx) => {
				let isSoloDoctor = body.isSoloDoctor;
				if (isSoloDoctor === undefined) {
					const [orgRecord] = await tx
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
						const chairsList = await tx
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

				const [inserted] = await tx
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

				const responsePayload: Record<string, unknown> = {
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
				};

				return {
					code: 201,
					body: responsePayload,
				};
			});

			return reply.code(txResult.code).send(txResult.body);
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
