import type { ChestnyZnakScannedItem } from "@dental/shared";
import type { MdlpOfflinePackage } from "../mdlpOfflineQueue.js";

/** Семантические режимы работы модуля учета маркированных препаратов */
export type MdlpScanMode =
	| "warehouse_acceptance"
	| "care_dispense"
	| "spoilage_disposal"
	| "acceptance_701"
	| "disposal_531"
	| "disposal_444";

export function isAcceptanceMode(mode: MdlpScanMode): boolean {
	return mode === "warehouse_acceptance" || mode === "acceptance_701";
}

export function isCareDispenseMode(mode: MdlpScanMode): boolean {
	return mode === "care_dispense" || mode === "disposal_531";
}

export function isSpoilageMode(mode: MdlpScanMode): boolean {
	return mode === "spoilage_disposal" || mode === "disposal_444";
}

/** Человеческие названия режимов работы для врача и персонала */
export const MDLP_MODE_TITLES: Record<string, string> = {
	warehouse_acceptance: "Приёмка на склад",
	acceptance_701: "Приёмка на склад",
	care_dispense: "Списание при оказании медпомощи",
	disposal_531: "Списание при оказании медпомощи",
	spoilage_disposal: "Списание по сроку годности / браку",
	disposal_444: "Списание по сроку годности / браку",
};

/** Статус сетевой связи с ИС «Честный ЗНАК» / ЦРПТ */
export type CrptServerStatus = "online" | "degraded" | "offline";

/** Пропсы главного модального окна маркировки медикаментов */
export interface MdlpScanningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialMode?: MdlpScanMode | undefined;
	readonly subjectId?: string | undefined;
	readonly shipperId?: string | undefined;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly clinicName?: string | undefined;
	readonly onDeferredDisposal?: ((pkg: MdlpOfflinePackage) => void) | undefined;
}

/** Состояние формы документа маркировки */
export interface MdlpDocumentState {
	readonly docNum: string;
	readonly docDate: string;
	readonly mode: MdlpScanMode;
}
