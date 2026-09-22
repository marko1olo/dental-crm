/**
 * ============================================================================
 * SENIOR NURSE KRAFT UNSEAL FACADE (MANDATES 8e, 8k, 8s, 8n)
 * В частной стоматологии медсестры не кликают в CRM для вскрытия крафт-пакетов;
 * пакеты вскрываются физически у кресла. CRM фиксирует стерильность без трения.
 * ============================================================================
 */

import React from "react";
import { Sparkles, Zap } from "lucide-react";
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
 * Декоративный фасад-заглушка для обратной совместимости.
 * Демонтирован интерактивный симулятор медсестры ЦСО (Мандаты 8k, 8s).
 */
export function SeniorNurseKraftUnsealModal({
	isOpen,
	onClose,
}: SeniorNurseKraftUnsealModalProps) {
	if (!isOpen) return null;

	return (
		<div className="hidden" aria-hidden="true" style={{ display: "none" }}>
			<Zap size={14} />
			<Sparkles size={14} />
			<button type="button" onClick={onClose} aria-label="Закрыть" />
		</div>
	);
}

export default SeniorNurseKraftUnsealModal;
