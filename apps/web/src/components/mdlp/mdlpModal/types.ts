import type { ChestnyZnakScannedItem } from "@dental/shared";
import type { MdlpOfflinePackage } from "../mdlpScanningPresets.js";

/** Режимы работы модалки МДЛП / Честный ЗНАК */
export type MdlpScanMode = "acceptance_701" | "disposal_531" | "disposal_444";

/** Статус сетевой связи с ИС «Честный ЗНАК» / ЦРПТ */
export type CrptServerStatus = "online" | "degraded" | "offline";

/** Статусы сканирования DataMatrix кода маркировки */
export type DataMatrixScanStatus = "verified" | "warning" | "expired" | "invalid";

/** Коды ошибок проверки кодов маркировки «Честный Знак» */
export type ChestnyZnakErrorCode =
	| "CODE_NOT_FOUND"
	| "ALREADY_DISPOSED"
	| "EXPIRED_BATCH"
	| "CRYPTO_TAIL_MISMATCH"
	| "CRYPTO_SIGNATURE_INVALID"
	| "UNAUTHORIZED_EMISSION"
	| "WRONG_OWNER_INN";

/** Типы упаковок анестетиков и медикаментов для быстрого выбытия */
export type AnestheticPackageType =
	| "articaine_1_100k"
	| "articaine_1_200k"
	| "mepivacaine_3pct"
	| "lidocaine_2pct"
	| "chlorhexidine_005"
	| "miramistin_001";

/** Пропсы главного модального окна сканирования МДЛП */
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
