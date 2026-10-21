/**
 * types.ts — Контракты параметров формирования актов и экспорта реестра ДМС
 */

import type { DmsRegistryServiceRecord, DmsRegistrySummary } from "../insuranceMath/types.js";

export interface ClinicActInfo {
	readonly name: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly bankAccount?: string | undefined;
	readonly bic?: string | undefined;
	readonly corrAccount?: string | undefined;
}

export interface InsurerActInfo {
	readonly name: string;
	readonly inn?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly contractNumber: string;
	readonly contractDate: string;
	readonly representative: string;
}

export interface BilateralAcceptanceActParams {
	readonly records: readonly DmsRegistryServiceRecord[];
	readonly summary: DmsRegistrySummary;
	readonly clinicInfo: ClinicActInfo;
	readonly insurerInfo: InsurerActInfo;
	readonly actNumber: string;
	readonly actDate: string;
}

export interface MeeActParams {
	readonly records: readonly DmsRegistryServiceRecord[];
	readonly summary: DmsRegistrySummary;
	readonly clinicInfo: ClinicActInfo;
	readonly insurerInfo: InsurerActInfo;
	readonly actNumber: string;
	readonly actDate: string;
	readonly expertDoctorName?: string | undefined;
}
