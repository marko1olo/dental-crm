/**
 * types.ts — Контракты параметров модального окна экспорта реестра ДМС
 */

import type { DmsRegistryServiceRecord } from "../insuranceMath.js";

export interface ClinicLegalInfo {
	readonly name: string;
	readonly inn: string;
	readonly kpp?: string;
	readonly ogrn?: string;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly bankAccount?: string;
	readonly bic?: string;
	readonly corrAccount?: string;
}

export interface DmsRegistryExportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly records?: readonly DmsRegistryServiceRecord[] | undefined;
	readonly clinicInfo?: ClinicLegalInfo;
}

export const DEFAULT_CLINIC_LEGAL_INFO: ClinicLegalInfo = {
	name: 'ООО «Стоматологический Центр «ДЕНТЕ»',
	inn: "7701984210",
	kpp: "770101001",
	ogrn: "1157746890123",
	address: "г. Москва, ул. Большая Спасская, д. 12, стр. 1",
	chiefDoctor: "Д-р Смирнов А.А.",
	bankAccount: "40702810400000012345",
	bic: "044525225",
	corrAccount: "30101810400000000225",
};
