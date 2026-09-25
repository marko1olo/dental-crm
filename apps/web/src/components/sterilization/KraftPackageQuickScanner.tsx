/**
 * ============================================================================
 * KRAFT PACKAGE QUICK SCANNER FACADE (MANDATES 8e, 8v, 8s, 8k)
 * Врач на приеме лечит людей, а не работает сканером крафт-пакетов со штрихкодами!
 * Медсестры в частной клинике не сидят за компьютером и не тыкают CRM.
 * Инструменты стерильны по умолчанию (дефолтный стерильный лоток по СанПиН).
 * Компонент сведен к единому SSOT с SeniorNurseKraftUnsealModal.
 * ============================================================================
 */

import type React from "react";
import type { ParsedKraftBarcode } from "@dental/shared";
import { SeniorNurseKraftUnsealModal } from "../sanpin/kraft/SeniorNurseKraftUnsealModal.js";

export interface KraftPackageQuickScannerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAttachToProtocol?: ((parsed: ParsedKraftBarcode) => void | Promise<void>) | undefined;
	readonly initialBarcode?: string | undefined;
	readonly currentDiaryBarcode?: string | null | undefined;
}

/**
 * Безопасный фасад-делегат без навязывания врачу и без процедурного блоата (Мандаты 8e, 8v, 8s, 8k).
 * Сведен к единому SSOT (SeniorNurseKraftUnsealModal).
 */
export function KraftPackageQuickScanner(
	props: KraftPackageQuickScannerProps,
): React.ReactElement | null {
	return SeniorNurseKraftUnsealModal(props as any);
}

export default KraftPackageQuickScanner;
