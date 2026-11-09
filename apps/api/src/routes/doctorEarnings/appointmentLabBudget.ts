/**
 * appointmentLabBudget.ts — Расчет распределения счетов ЗТЛ между приемами врача.
 * Mandate 8e: Doctor Autonomy & Financial Sovereignty.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { LiveCalculationInput } from "./liveEarningsTypes.js";
import { LAB_DEDUCTED_CATEGORIES } from "./constants.js";

/** Статусы нарядов, дающие реальный счет ЗТЛ (синхронно с liveLabOrdersProcessor). */
const PAID_LAB_STATUSES = new Set(["sent", "in_progress", "shipped", "received", "refitting", "completed"]);

/**
 * Распределяет счета ЗТЛ пациентов между приемами врача один раз:
 * 1. Наряды с явным appointment_id списываются СТРОГО с того приема, к которому они привязаны.
 * 2. Непривязанные наряды распределяются между ортопедическими приемами пациента пропорционально выручке.
 * Суммарный вычет за период строго равен сумме живых счетов лаборатории — без задвоения между приемами.
 */
export function buildAppointmentLabBudget(input: LiveCalculationInput): Map<string, number> {
	const budget = new Map<string, number>();
	if (input.dbLabOrders.length === 0 || input.rawAppointments.length === 0) return budget;

	const allAptIds = new Set(input.rawAppointments.map((a) => a.id));
	const unassignedPatientLabTotal = new Map<string, number>();

	for (const lo of input.dbLabOrders) {
		if (!lo.patientId || lo.isWarranty || !PAID_LAB_STATUSES.has(String(lo.status))) continue;
		const costKop = Math.round((parseFloat(String(lo.labCostRub ?? 0)) || 0) * 100);
		if (costKop <= 0) continue;

		if (lo.appointmentId && allAptIds.has(lo.appointmentId)) {
			// Наряд явно привязан к конкретному приему: относим вычет строго на него
			budget.set(lo.appointmentId, (budget.get(lo.appointmentId) ?? 0) + costKop);
		} else if (!lo.appointmentId) {
			// Непривязанный наряд (легаси): накапливаем для распределения по пациенту
			unassignedPatientLabTotal.set(
				lo.patientId,
				(unassignedPatientLabTotal.get(lo.patientId) ?? 0) + costKop,
			);
		}
	}

	if (unassignedPatientLabTotal.size === 0) return budget;

	// Ортопедическая выручка каждого приема: база распределения счета пациента.
	const aptOrthoGross = new Map<string, number>();
	for (const apt of input.rawAppointments) {
		if (!apt.patientId || !unassignedPatientLabTotal.has(apt.patientId)) continue;
		const visitId = input.appointmentToVisitMap.get(apt.id) || null;
		const treatments = visitId ? input.dbTreatmentItems.filter((t) => t.visitId === visitId) : [];
		const orthoGross = treatments
			.filter((t) => LAB_DEDUCTED_CATEGORIES.has(t.category || "therapy"))
			.reduce((sum, t) => sum + Math.round((parseFloat(String(t.priceRub)) || 0) * 100), 0);
		aptOrthoGross.set(apt.id, orthoGross);
	}

	for (const [patientId, labKopTotal] of unassignedPatientLabTotal) {
		const patientAptIds = input.rawAppointments.filter((a) => a.patientId === patientId).map((a) => a.id);
		if (patientAptIds.length === 0) continue;

		// Всем приемам пациента явно проставляется доля (в том числе 0),
		// чтобы ни один наряд не был вычтен повторно по фолбэку.
		const orthoSum = patientAptIds.reduce((sum, id) => sum + (aptOrthoGross.get(id) ?? 0), 0);
		if (orthoSum <= 0) {
			// Нет ортопедической выручки в приемах этого врача: наряд ЗТЛ НЕ списывается с терапевтических манипуляций ([LAB-03]).
			for (const aptId of patientAptIds) {
				if (!budget.has(aptId)) budget.set(aptId, 0);
			}
			continue;
		}
		if (patientAptIds.length === 1) {
			// Один прием и у него есть ортопедическая выручка: счет относится к нему.
			const aid = patientAptIds[0]!;
			budget.set(aid, (budget.get(aid) ?? 0) + labKopTotal);
			continue;
		}
		let remaining = labKopTotal;
		for (const aptId of patientAptIds) {
			const aptGross = aptOrthoGross.get(aptId) ?? 0;
			const share = Math.min(remaining, Math.round((labKopTotal * aptGross) / orthoSum));
			budget.set(aptId, (budget.get(aptId) ?? 0) + share);
			remaining -= share;
		}
		if (remaining > 0) {
			const lastId = patientAptIds[patientAptIds.length - 1]!;
			budget.set(lastId, (budget.get(lastId) ?? 0) + remaining);
		}
	}
	return budget;
}
