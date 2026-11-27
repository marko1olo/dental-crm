/**
 * apps/api/src/services/reports/managerReports/assistantPayrollReports.ts
 *
 * Прозрачный расчет оплаты труда ассистентов клиники (PAY-05):
 * 1. Фиксация смен и отработанных часов по реальным назначениям в расписании (appointments.assistantUserId).
 * 2. Доплаты за снимки (RVG/ОПТГ/КЛКТ) и ассистирование на хирургических операциях.
 * 3. Расчет НДФЛ 13% и чистой выплаты на руки (Net Payout) в целочисленных копейках без float-погрешностей.
 *
 * Соответствие Мандату 8b (Sweet Spot: 80–130 строк).
 */

import { and, eq, gte, inArray, isNotNull, lte, ne, or } from "drizzle-orm";
import {
	ASSISTANT_SHIFT_RULE,
	type AssistantShiftLogItem,
	calculateAssistantPeriodPayroll,
	kopecksToRubles,
} from "@dental/shared";
import { withTenantReadCtx, type TenantDb } from "../../../db/rls.js";
import {
	formatDateIsoInTimeZone,
	resolveClinicTimeZone,
} from "../../../routes/payrollModules/payrollTypesAndQueries.js";
import {
	appointments,
	doctorShiftRosters,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../../db/schema.js";
import type { ReportScope } from "./types.js";

export type AssistantPayrollRow = {
	readonly assistantId: string;
	readonly assistantName: string;
	readonly role: string;
	readonly appointmentsAssisted: number;
	readonly shiftsCount: number;
	readonly hoursWorked: number;
	readonly radiographCount: number;
	readonly surgeryCount: number;
	readonly baseShiftPayoutRub: number;
	readonly baseShiftPayoutKopecks: number;
	readonly radiographPayoutRub: number;
	readonly radiographPayoutKopecks: number;
	readonly surgeryPayoutRub: number;
	readonly surgeryPayoutKopecks: number;
	readonly grossPayoutRub: number;
	readonly grossPayoutKopecks: number;
	readonly ndflTaxRub: number;
	readonly ndflTaxKopecks: number;
	readonly payoutRub: number;
	readonly payoutKopecks: number;
};

export type AssistantPayrollReportData = {
	readonly period: { readonly from: string; readonly to: string };
	readonly rows: AssistantPayrollRow[];
	readonly totals: {
		readonly totalShiftsCount: number;
		readonly totalAppointmentsAssisted: number;
		readonly totalGrossPayoutRub: number;
		readonly totalGrossPayoutKopecks: number;
		readonly totalNdflTaxRub: number;
		readonly totalNdflTaxKopecks: number;
		readonly totalPayoutRub: number;
		readonly totalPayoutKopecks: number;
	};
	readonly isEmpty: boolean;
};

export async function assistantPayrollReport(
	scope: ReportScope,
	executor?: TenantDb,
): Promise<AssistantPayrollReportData> {
	const runQuery = async (tx: TenantDb): Promise<AssistantPayrollReportData> => {
		const clinicTimeZone = scope.timeZone ?? (await resolveClinicTimeZone(tx, scope.organizationId));
		// 1. Ассистенты и медицинские сестры клиники из штатного расписания
		const assistantUsers = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				role: users.role,
			})
			.from(users)
			.where(
				and(
					eq(users.organizationId, scope.organizationId),
					or(eq(users.role, "assistant"), eq(users.role, "nurse")),
				),
			);

		// 2. Все проведенные приёмы с назначенными ассистентами за период (исключая отмененные)
		const assistantAppointments = await tx
			.select({
				assistantUserId: appointments.assistantUserId,
				assistantName: users.fullName,
				assistantRole: users.role,
				appointmentId: appointments.id,
				status: appointments.status,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				clinicalStage: appointments.clinicalStage,
			})
			.from(appointments)
			.leftJoin(users, and(eq(appointments.assistantUserId, users.id), eq(users.organizationId, scope.organizationId)))
			.where(
				and(
					eq(appointments.organizationId, scope.organizationId),
					isNotNull(appointments.assistantUserId),
					ne(appointments.status, "cancelled"),
					gte(appointments.startsAt, scope.from),
					lte(appointments.startsAt, scope.to),
				),
			);

		// 3. Смены из графика дежурств и табеля doctor_shift_rosters
		const fromDateIso = formatDateIsoInTimeZone(scope.from, clinicTimeZone);
		const toDateIso = formatDateIsoInTimeZone(scope.to, clinicTimeZone);
		const rosterShifts = await tx
			.select({
				doctorId: doctorShiftRosters.doctorId,
				doctorName: doctorShiftRosters.doctorName,
				dateIso: doctorShiftRosters.dateIso,
				startTime: doctorShiftRosters.startTime,
				endTime: doctorShiftRosters.endTime,
				role: doctorShiftRosters.role,
			})
			.from(doctorShiftRosters)
			.where(
				and(
					eq(doctorShiftRosters.organizationId, scope.organizationId),
					gte(doctorShiftRosters.dateIso, fromDateIso),
					lte(doctorShiftRosters.dateIso, toDateIso),
				),
			);

		const assistantsMap = new Map<string, { name: string; role: string }>();
		for (const u of assistantUsers) {
			assistantsMap.set(u.id, {
				name: u.fullName || "Ассистент стоматолога",
				role: u.role === "nurse" ? "Медицинская сестра" : "Ассистент стоматолога",
			});
		}

		for (const s of rosterShifts) {
			const isAstRole = s.role === "assistant" || s.role === "nurse";
			if (isAstRole || assistantsMap.has(s.doctorId)) {
				if (!assistantsMap.has(s.doctorId)) {
					assistantsMap.set(s.doctorId, {
						name: s.doctorName || "Ассистент клиники",
						role: s.role === "nurse" ? "Медицинская сестра" : "Ассистент стоматолога",
					});
				}
			}
		}

		const apptsByAssistant = new Map<string, typeof assistantAppointments>();
		for (const appt of assistantAppointments) {
			const astId = appt.assistantUserId;
			if (!astId) continue;
			if (!assistantsMap.has(astId)) {
				assistantsMap.set(astId, {
					name: appt.assistantName || "Ассистент клиники",
					role: appt.assistantRole === "nurse" ? "Медицинская сестра" : "Ассистент стоматолога",
				});
			}
			const list = apptsByAssistant.get(astId) ?? [];
			list.push(appt);
			apptsByAssistant.set(astId, list);
		}

		// Реляционная выборка услуг наряда по справочнику и кодам 804н
		const allApptIds = assistantAppointments.map((a) => a.appointmentId);
		const apptVisits = allApptIds.length > 0
			? await tx
					.select({
						id: visits.id,
						appointmentId: visits.appointmentId,
					})
					.from(visits)
					.where(
						and(
							eq(visits.organizationId, scope.organizationId),
							inArray(visits.appointmentId, allApptIds),
						),
					)
			: [];

		const visitIds = apptVisits.map((v) => v.id);
		const visitToAppt = new Map(apptVisits.map((v) => [v.id, v.appointmentId]));
		const apptServicesMap = new Map<string, { radiographs: number; surgeries: number }>();

		if (visitIds.length > 0) {
			const items = await tx
				.select({
					visitId: treatmentItems.visitId,
					code: serviceCatalogItems.code,
					order804nCode: serviceCatalogItems.order804nCode,
					category: serviceCatalogItems.category,
				})
				.from(treatmentItems)
				.leftJoin(
					serviceCatalogItems,
					and(
						eq(treatmentItems.serviceId, serviceCatalogItems.id),
						eq(serviceCatalogItems.organizationId, scope.organizationId),
					),
				)
				.where(
					and(
						eq(treatmentItems.organizationId, scope.organizationId),
						inArray(treatmentItems.visitId, visitIds),
					),
				);

			for (const it of items) {
				const apptId = it.visitId ? visitToAppt.get(it.visitId) : undefined;
				if (!apptId) continue;

				const code = (it.order804nCode || it.code || "").toUpperCase();
				const cat = String(it.category || "").toLowerCase();
				const isRad = code.startsWith("A06") || cat === "xray" || cat === "radiology";
				const isNonSurgicalCode =
					code.startsWith("A16.07.002") ||
					code.startsWith("A16.07.051") ||
					code.startsWith("A16.07.003") ||
					code.startsWith("A16.07.004") ||
					code.startsWith("A16.07.008") ||
					code.startsWith("A16.07.025") ||
					code.startsWith("A16.07.050");
				const SURGERY_PREFIXES = [
					"A16.07.001",
					"A16.07.007",
					"A16.07.011",
					"A16.07.012",
					"A16.07.013",
					"A16.07.016",
					"A16.07.017",
					"A16.07.024",
					"A16.07.026",
					"A16.07.041",
					"A16.07.042",
					"A16.07.043",
					"A16.07.054",
					"A16.07.055",
					"A16.07.058",
					"A16.07.089",
					"A16.07.090",
					"A16.07.096",
				];
				const isSurg =
					!isNonSurgicalCode &&
					(SURGERY_PREFIXES.some((prefix) => code.startsWith(prefix)) || cat === "surgery");

				const cur = apptServicesMap.get(apptId) ?? { radiographs: 0, surgeries: 0 };
				if (isRad) cur.radiographs += 1;
				if (isSurg) cur.surgeries += 1;
				apptServicesMap.set(apptId, cur);
			}
		}

		const rows: AssistantPayrollRow[] = [];
		let totalShiftsCount = 0;
		let totalAppointmentsAssisted = 0;
		let totalGrossPayoutKopecks = 0;
		let totalNdflTaxKopecks = 0;
		let totalPayoutKopecks = 0;

		const periodLabel = `${fromDateIso} — ${toDateIso}`;

		for (const [astId, meta] of assistantsMap.entries()) {
			const appts = apptsByAssistant.get(astId) ?? [];
			totalAppointmentsAssisted += appts.length;

			const dayMap = new Map<string, { minutes: number; radiographs: number; surgeries: number }>();
			let totalRadiographs = 0;
			let totalSurgeries = 0;

			for (const appt of appts) {
				const dayKey = formatDateIsoInTimeZone(appt.startsAt, clinicTimeZone);
				const durationMin = Math.max(
					15,
					Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000),
				);

				const relCounts = apptServicesMap.get(appt.appointmentId);
				const radCount = relCounts?.radiographs ?? 0;
				const surgCount = relCounts?.surgeries ?? 0;

				totalRadiographs += radCount;
				totalSurgeries += surgCount;

				const dayData = dayMap.get(dayKey) ?? { minutes: 0, radiographs: 0, surgeries: 0 };
				dayData.minutes += durationMin;
				dayData.radiographs += radCount;
				dayData.surgeries += surgCount;
				dayMap.set(dayKey, dayData);
			}

			for (const rShift of rosterShifts) {
				if (rShift.doctorId !== astId) continue;
				const dayKey = rShift.dateIso.slice(0, 10);
				const [shStart, smStart] = (rShift.startTime || "09:00").split(":").map(Number);
				const [shEnd, smEnd] = (rShift.endTime || "15:00").split(":").map(Number);
				const startMin = (shStart || 0) * 60 + (smStart || 0);
				const endMin = (shEnd || 0) * 60 + (smEnd || 0);
				const shiftDurationMin = Math.max(60, endMin > startMin ? endMin - startMin : 360);

				const dayData = dayMap.get(dayKey) ?? { minutes: 0, radiographs: 0, surgeries: 0 };
				dayData.minutes = Math.max(dayData.minutes, shiftDurationMin);
				dayMap.set(dayKey, dayData);
			}

			const shiftLogs: AssistantShiftLogItem[] = Array.from(dayMap.entries()).map(
				([dateIso, d], idx) => {
					const hoursWorked = Math.max(1, Number((d.minutes / 60).toFixed(1)));
					const shiftType = hoursWorked > 8 ? "full_12h" : "standard_6h";
					return {
						id: `shift-${astId}-${idx}`,
						dateIso,
						shiftType,
						hoursWorked,
						radiographsTakenCount: d.radiographs,
						surgeriesAssistedCount: d.surgeries,
					};
				},
			);

			totalShiftsCount += shiftLogs.length;

			const calc = calculateAssistantPeriodPayroll(
				astId,
				meta.name,
				periodLabel,
				shiftLogs,
				ASSISTANT_SHIFT_RULE,
			);

			totalGrossPayoutKopecks += calc.totalGrossPayoutKop;
			totalNdflTaxKopecks += calc.ndfl13TaxKop;
			totalPayoutKopecks += calc.netPayoutToAssistantKop;

			rows.push({
				assistantId: astId,
				assistantName: meta.name,
				role: meta.role,
				appointmentsAssisted: appts.length,
				shiftsCount: shiftLogs.length,
				hoursWorked: shiftLogs.reduce((acc, s) => acc + s.hoursWorked, 0),
				radiographCount: totalRadiographs,
				surgeryCount: totalSurgeries,
				baseShiftPayoutRub: kopecksToRubles(calc.baseShiftPayoutKop),
				baseShiftPayoutKopecks: calc.baseShiftPayoutKop,
				radiographPayoutRub: kopecksToRubles(calc.radiographPayoutKop),
				radiographPayoutKopecks: calc.radiographPayoutKop,
				surgeryPayoutRub: kopecksToRubles(calc.surgeryPayoutKop),
				surgeryPayoutKopecks: calc.surgeryPayoutKop,
				grossPayoutRub: kopecksToRubles(calc.totalGrossPayoutKop),
				grossPayoutKopecks: calc.totalGrossPayoutKop,
				ndflTaxRub: kopecksToRubles(calc.ndfl13TaxKop),
				ndflTaxKopecks: calc.ndfl13TaxKop,
				payoutRub: kopecksToRubles(calc.netPayoutToAssistantKop),
				payoutKopecks: calc.netPayoutToAssistantKop,
			});
		}

		rows.sort((a, b) => b.payoutKopecks - a.payoutKopecks);

		return {
			period: {
				from: scope.from.toISOString(),
				to: scope.to.toISOString(),
			},
			rows,
			totals: {
				totalShiftsCount,
				totalAppointmentsAssisted,
				totalGrossPayoutRub: kopecksToRubles(totalGrossPayoutKopecks),
				totalGrossPayoutKopecks,
				totalNdflTaxRub: kopecksToRubles(totalNdflTaxKopecks),
				totalNdflTaxKopecks,
				totalPayoutRub: kopecksToRubles(totalPayoutKopecks),
				totalPayoutKopecks,
			},
			isEmpty: rows.length === 0 || totalPayoutKopecks === 0,
		};
	};

	if (executor) return runQuery(executor);
	return withTenantReadCtx(scope.organizationId, runQuery);
}
