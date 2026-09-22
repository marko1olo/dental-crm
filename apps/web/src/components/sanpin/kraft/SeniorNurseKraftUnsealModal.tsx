/**
 * ============================================================================
 * SENIOR NURSE KRAFT UNSEAL FACADE (MANDATES 8e, 8k, 8s, 8n)
 * В частной стоматологии медсестры не кликают в CRM для вскрытия крафт-пакетов;
 * пакеты вскрываются физически у кресла. CRM фиксирует стерильность без трения.
 * Демонтированы процедурный симулятор медсестры и скрытая ширма (Мандаты 8k, 8s).
 * ============================================================================
 */

import {
	type KraftPackageRecord,
	createStandardTrayKraftPackageRecord,
	createDynamicKraftPackage,
} from "./kraftPackageEngine.js";

export const KRAFT_STORAGE_KEY = "dente_sterilization_kraft_packages";

export {
	createStandardTrayKraftPackageRecord,
	createDynamicKraftPackage,
};

export interface SeniorNurseKraftUnsealModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly activeBatchRecords?: readonly KraftPackageRecord[] | undefined;
	readonly onUnsealPackage?: ((pkg: KraftPackageRecord) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly patientName?: string | undefined;
	readonly toothNumber?: number | undefined;
}

/**
 * Чистый фасад без скрытых ширм и мусора (Мандаты 8k, 8s).
 */
export function SeniorNurseKraftUnsealModal(
	_props: SeniorNurseKraftUnsealModalProps,
): null {
	return null;
}

export default SeniorNurseKraftUnsealModal;
