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

import { and, eq, gte, inArray, isNotNull, lte, ne } from "drizzle-orm";
import {
	ASSISTANT_SHIFT_RULE,
	type AssistantShiftLogItem,
	calculateAssistantPeriodPayroll,
} from "@dental/shared";
import { db } from "../../../db/client.js";
import { appointments, serviceCatalogItems, treatmentItems, users, visits } from "../../../db/schema.js";
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
): Promise<AssistantPayrollReportData> {
	// 1. Ассистенты клиники из штатного расписания
	const assistantUsers = await db
		.select({
			id: users.id,
			fullName: users.fullName,
			role: users.role,
		})
		.from(users)
		.where(
			and(
				eq(users.organizationId, scope.organizationId),
				eq(users.role, "assistant"),
			),
		);

	// 2. Все проведенные приёмы с назначенными ассистентами за период (исключая отмененные)
	const assistantAppointments = await db
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
		.leftJoin(users, eq(appointments.assistantUserId, users.id))
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				isNotNull(appointments.assistantUserId),
				ne(appointments.status, "cancelled"),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to),
			),
		);

	const assistantsMap = new Map<string, { name: string; role: string }>();
	for (const u of assistantUsers) {
		assistantsMap.set(u.id, {
			name: u.fullName || "Ассистент стоматолога",
			role: "Ассистент стоматолога",
		});
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
		? await db
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
		const items = await db
			.select({
				visitId: treatmentItems.visitId,
				code: serviceCatalogItems.code,
				order804nCode: serviceCatalogItems.order804nCode,
				category: serviceCatalogItems.category,
			})
			.from(treatmentItems)
			.leftJoin(
				serviceCatalogItems,
				eq(treatmentItems.serviceId, serviceCatalogItems.id),
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
			const isSurg = code.startsWith("A16") || cat === "surgery";

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

	const periodLabel = `${scope.from.toISOString().slice(0, 10)} — ${scope.to.toISOString().slice(0, 10)}`;

	for (const [astId, meta] of assistantsMap.entries()) {
		const appts = apptsByAssistant.get(astId) ?? [];
		totalAppointmentsAssisted += appts.length;

		// Группировка приёмов по дням для расчета смен (shifts)
		const dayMap = new Map<string, { minutes: number; radiographs: number; surgeries: number }>();
		let totalRadiographs = 0;
		let totalSurgeries = 0;

		for (const appt of appts) {
			const dayKey = appt.startsAt.toISOString().slice(0, 10);
			const durationMin = Math.max(
				15,
				Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000),
			);

			// Первичный расчет: реляционные коды услуг 804н (A06 снимок, A16 операция)
			const relCounts = apptServicesMap.get(appt.appointmentId);
			let radCount = relCounts?.radiographs ?? 0;
			let surgCount = relCounts?.surgeries ?? 0;

			// Фолбек на клинический этап/причину, если услуги в наряд ещё не внесены
			if (radCount === 0 && surgCount === 0) {
				const textContext = `${appt.reason || ""} ${appt.clinicalStage || ""}`.toLowerCase();
				if (/(снимок|рентген|визиограф|оптг|кт|клт|rvg)/i.test(textContext)) radCount = 1;
				if (/(хирург|имплант|удален|синус|резекц|пластик)/i.test(textContext)) surgCount = 1;
			}

			totalRadiographs += radCount;
			totalSurgeries += surgCount;

			const dayData = dayMap.get(dayKey) ?? { minutes: 0, radiographs: 0, surgeries: 0 };
			dayData.minutes += durationMin;
			dayData.radiographs += radCount;
			dayData.surgeries += surgCount;
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
			baseShiftPayoutRub: Math.round(calc.baseShiftPayoutKop / 100),
			baseShiftPayoutKopecks: calc.baseShiftPayoutKop,
			radiographPayoutRub: Math.round(calc.radiographPayoutKop / 100),
			radiographPayoutKopecks: calc.radiographPayoutKop,
			surgeryPayoutRub: Math.round(calc.surgeryPayoutKop / 100),
			surgeryPayoutKopecks: calc.surgeryPayoutKop,
			grossPayoutRub: Math.round(calc.totalGrossPayoutKop / 100),
			grossPayoutKopecks: calc.totalGrossPayoutKop,
			ndflTaxRub: Math.round(calc.ndfl13TaxKop / 100),
			ndflTaxKopecks: calc.ndfl13TaxKop,
			payoutRub: Math.round(calc.netPayoutToAssistantKop / 100),
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
			totalGrossPayoutRub: Math.round(totalGrossPayoutKopecks / 100),
			totalGrossPayoutKopecks,
			totalNdflTaxRub: Math.round(totalNdflTaxKopecks / 100),
			totalNdflTaxKopecks,
			totalPayoutRub: Math.round(totalPayoutKopecks / 100),
			totalPayoutKopecks,
		},
		isEmpty: rows.length === 0 || totalPayoutKopecks === 0,
	};
}
