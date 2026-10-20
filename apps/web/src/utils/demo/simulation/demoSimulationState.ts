/**
 * demoSimulationState.ts
 *
 * Layer 1: Хранилище состояния в памяти для интерактивных мутаций в демо-режиме.
 */

import type { Appointment } from "@dental/shared";
import {
	getDemoShowcaseAppointments,
	isDemoShowcaseMode,
} from "../../demoModeEngine.js";
import {
	DEMO_THERAPIST_ODONTOGRAM,
	DEMO_THERAPIST_ESTIMATE,
	type DemoOdontogramToothState,
	type DemoEstimateItem,
	type DemoEstimate,
} from "../demoClinicalCases.js";

export class DemoInteractiveState {
	private appointments: Appointment[] = [];
	private odontogramStates: Map<string, DemoOdontogramToothState[]> = new Map();
	private estimates: Map<string, DemoEstimate> = new Map();
	private activeRoleId = "therapist";
	private initialized = false;

	private ensureInitialized() {
		if (!this.initialized) {
			this.resetToDefaults();
		}
	}

	public resetToDefaults() {
		this.initialized = true;
		try {
			if (typeof getDemoShowcaseAppointments === "function") {
				this.appointments = getDemoShowcaseAppointments();
			} else {
				this.appointments = [];
			}
		} catch {
			this.appointments = [];
		}
		this.odontogramStates.set(
			"01a00000-0000-0000-0000-000000000001",
			[...DEMO_THERAPIST_ODONTOGRAM],
		);
		this.estimates.set(
			"01a00000-0000-0000-0000-000000000001",
			JSON.parse(JSON.stringify(DEMO_THERAPIST_ESTIMATE)),
		);
	}

	public getAppointments(): Appointment[] {
		this.ensureInitialized();
		if (this.appointments.length === 0 && typeof getDemoShowcaseAppointments === "function") {
			try {
				this.appointments = getDemoShowcaseAppointments();
			} catch {
				this.appointments = [];
			}
		}
		return [...this.appointments];
	}

	public updateAppointmentStatus(
		appointmentId: string,
		newStatus: Appointment["status"],
	): { success: boolean; appointment?: Appointment } {
		this.ensureInitialized();
		if (this.appointments.length === 0 && typeof getDemoShowcaseAppointments === "function") {
			try {
				this.appointments = getDemoShowcaseAppointments();
			} catch {
				this.appointments = [];
			}
		}
		const apt = this.appointments.find((a) => a.id === appointmentId);
		if (!apt) {
			return { success: false };
		}
		apt.status = newStatus;
		return { success: true, appointment: { ...apt } };
	}

	public getOdontogram(patientId: string): DemoOdontogramToothState[] {
		this.ensureInitialized();
		const existing = this.odontogramStates.get(patientId);
		if (existing) return [...existing];
		// default to therapist odontogram
		return [...DEMO_THERAPIST_ODONTOGRAM];
	}

	public applyToothState(
		patientId: string,
		toothNumber: number,
		patch: Partial<DemoOdontogramToothState>,
	): DemoOdontogramToothState[] {
		this.ensureInitialized();
		const current = this.getOdontogram(patientId);
		const idx = current.findIndex((t) => t.toothNumber === toothNumber);
		if (idx >= 0) {
			current[idx] = { ...current[idx]!, ...patch };
		} else {
			current.push({
				toothNumber,
				state: patch.state || "caries",
				titleRu: patch.titleRu || `Зуб ${toothNumber}`,
				clinicalNote: patch.clinicalNote || "Клинический осмотр",
				color: patch.color || "var(--danger, #ef4444)",
				surfaces: patch.surfaces || ["O"],
			});
		}
		this.odontogramStates.set(patientId, current);
		return [...current];
	}

	public getEstimate(patientId: string): DemoEstimate {
		this.ensureInitialized();
		const existing = this.estimates.get(patientId);
		if (existing) return existing;
		return JSON.parse(JSON.stringify(DEMO_THERAPIST_ESTIMATE));
	}

	public addServiceToEstimate(
		patientId: string,
		item: DemoEstimateItem,
	): DemoEstimate {
		this.ensureInitialized();
		const est = this.getEstimate(patientId);
		est.items.push(item);
		est.totalGrossRub = est.items.reduce((sum, i) => sum + i.totalRub, 0);
		est.totalNetRub = Math.max(0, est.totalGrossRub - est.totalDiscountRub);
		this.estimates.set(patientId, est);
		return { ...est };
	}

	public getActiveRoleId(): string {
		return this.activeRoleId;
	}

	public setActiveRoleId(roleId: string) {
		this.activeRoleId = roleId;
	}
}

export const _demoStateInstance = new DemoInteractiveState();

/**
 * Проверяет, разрешена ли симуляция (строго в демо-режиме / Мандат 8c Zero Mocks & 8y Fail-Closed).
 */
export function isSimulationAllowed(): boolean {
	return isDemoShowcaseMode();
}
