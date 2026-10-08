/**
 * @file types.ts
 * @description Layer 0: Domain state types, administrative patch types, and fixture interfaces.
 */

import type { DomainState } from "../types/domainState.js";
import type { PatientAdministrativeProfile, StaffMember } from "@dental/shared";

export type { DomainState };

type PatientAdministrativeProfilePatch = {
	[K in keyof PatientAdministrativeProfile]?:
		| PatientAdministrativeProfile[K]
		| undefined;
};

export type UpdateStaffMemberProfileInput = {
	fullName?: string | undefined;
	role?: StaffMember["role"] | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
	active?: boolean | undefined;
};

/**
 * Поля кресла, которые правит адрес PUT /api/settings/chairs/:chairId.
 *
 * Только название и признак активности: в таблице chairs больше ничего из
 * карточки кресла не хранится, а кабинет, специализация и оснащение читаются
 * из базы как пустые значения. Принимать их значило бы молча терять ввод.
 */
export type UpdateChairProfileInput = {
	name?: string | undefined;
	active?: boolean | undefined;
};


export interface SampleInventoryItem {
	id: string;
	organizationId: string;
	sku: string;
	name: string;
	category: "medication" | "consumable" | "implant" | "hygiene" | "anesthetic";
	unit: string;
	stockQuantity: number;
	minimumQuantity: number;
	reorderQuantity: number;
	unitCostRub: number;
	batchNumber: string;
	expirationDate: string;
	supplierName: string;
	storageLocation: string;
}

export interface SampleSanpinJournalEntry {
	id: string;
	organizationId: string;
	logType: "autoclave" | "disinfection" | "general_cleaning" | "waste_b" | "bactericidal_lamp";
	timestamp: string;
	equipmentName: string;
	cycleNumber?: number;
	temperatureCelsius?: number;
	pressureBar?: number;
	durationMinutes: number;
	chemicalIndicatorResult: "passed" | "failed";
	biologicalIndicatorResult?: "passed" | "failed";
	performedByStaffId: string;
	verifiedByStaffId?: string;
	notes?: string;
}

export function replaceCollection<T>(target: T[], source: T[] = []): void {
	target.splice(0, target.length, ...source);
}

export function nullableTrimmed(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export type { PatientAdministrativeProfilePatch };
