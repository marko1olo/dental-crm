/**
 * demoClinicalActionsSimulation.ts
 *
 * Layer 2: Симуляция клинических действий врача:
 * - Смена статуса приёма в расписании
 * - Интерактивный клик по зубу в одонтограмме
 * - Расчёт и модификация сметы и чека
 */

import type { Appointment } from "@dental/shared";
import {
	isDemoShowcaseMode,
	isDemoPatientId,
	isDemoTenant,
} from "../../demoModeEngine.js";
import type {
	DemoOdontogramToothState,
	DemoEstimateItem,
	DemoEstimate,
} from "../demoClinicalCases.js";
import { _demoStateInstance } from "./demoSimulationState.js";

/**
 * Получить интерактивные приёмы демо-режима (изолировано: пустой массив в боевом режиме).
 */
export function getLiveDemoAppointments(): Appointment[] {
	if (!isDemoShowcaseMode()) {
		return [];
	}
	return _demoStateInstance.getAppointments();
}

/**
 * Мгновенная симуляция смены статуса приёма («В кресле» -> «Завершен») с параллельным
 * сохранением в PostgreSQL 18 через Fastify API.
 * В боевом режиме отклоняется (Fail-Closed) для защиты реального расписания врача,
 * если прием не является изолированным демо-приемом.
 */
export function simulateDemoAppointmentStatusChange(
	appointmentId: string,
	newStatus: Appointment["status"],
): { success: boolean; appointment?: Appointment; error?: string } {
	const isDemo =
		isDemoShowcaseMode() ||
		isDemoTenant(appointmentId) ||
		appointmentId.startsWith("01a0");
	if (!isDemo) {
		return {
			success: false,
			error: "Simulation rejected: live production appointment is protected",
		};
	}
	const localResult = _demoStateInstance.updateAppointmentStatus(
		appointmentId,
		newStatus,
	);
	if (typeof window !== "undefined" && typeof window.fetch === "function") {
		try {
			void window
				.fetch(`/api/appointments/${encodeURIComponent(appointmentId)}/status`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: newStatus }),
				})
				.catch(() => {});
		} catch {
			// non-blocking API persistence
		}
	}
	return localResult;
}

/**
 * Получить зубную формулу пациента в демо-режиме (изолировано: пустой массив для реального пациента в боевом режиме).
 */
export function getLiveDemoOdontogram(
	patientId: string,
): DemoOdontogramToothState[] {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	if (!isDemo) {
		return [];
	}
	return _demoStateInstance.getOdontogram(patientId);
}

/**
 * Клик по зубу в одонтограмме: мгновенная мутация состояния в демо-режиме
 * с параллельным сохранением в PostgreSQL 18 (`tooth_states` + `tooth_state_history`).
 * В боевом режиме отклоняется для реальных пациентов без вмешательства в их медкарту.
 */
export function simulateDemoToothClick(
	patientId: string,
	toothNumber: number,
	patch: Partial<DemoOdontogramToothState>,
): DemoOdontogramToothState[] {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	if (!isDemo) {
		return [];
	}
	const updated = _demoStateInstance.applyToothState(
		patientId,
		toothNumber,
		patch,
	);
	if (typeof window !== "undefined" && typeof window.fetch === "function") {
		try {
			void window
				.fetch(
					`/api/patients/${encodeURIComponent(patientId)}/tooth-states/batch`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							toothNumbers: [toothNumber],
							state: patch.state || "caries",
							surfaces: patch.surfaces,
							notes: patch.clinicalNote,
						}),
					},
				)
				.catch(() => {});
		} catch {
			// non-blocking API persistence
		}
	}
	return updated;
}

/**
 * Добавление услуги в смету в демо-режиме.
 * В боевом режиме для реального пациента возвращает пустую смету без мутации боевой кассы.
 */
export function simulateDemoAddServiceToEstimate(
	patientId: string,
	item: DemoEstimateItem,
): DemoEstimate {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	if (!isDemo) {
		return {
			estimateNumber: "СМЕТА-ПУСТО",
			patientId,
			patientName: "Реальный пациент",
			doctorId: "",
			doctorName: "",
			dateIso: new Date().toISOString(),
			items: [],
			totalGrossRub: 0,
			totalDiscountRub: 0,
			totalNetRub: 0,
			status: "draft",
		};
	}
	return _demoStateInstance.addServiceToEstimate(patientId, item);
}

/**
 * Получить текущую смету пациента в демо-режиме.
 */
export function getLiveDemoEstimate(patientId: string): DemoEstimate {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	if (!isDemo) {
		return {
			estimateNumber: "СМЕТА-ПУСТО",
			patientId,
			patientName: "Реальный пациент",
			doctorId: "",
			doctorName: "",
			dateIso: new Date().toISOString(),
			items: [],
			totalGrossRub: 0,
			totalDiscountRub: 0,
			totalNetRub: 0,
			status: "draft",
		};
	}
	return _demoStateInstance.getEstimate(patientId);
}
