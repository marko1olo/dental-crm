/**
 * perioPresetTypes.ts — Типы применения пресетов пародонтограммы.
 * Архитектурный слой Layer 0: Types (Мандат 8b, <= 120 строк).
 */

import type { PerioToothRecord } from "@dental/shared";

export interface PresetApplyResult {
	updatedTeeth: PerioToothRecord[];
	protocolText: string;
	title: string;
	service?: {
		code: string;
		name: string;
		price: number;
		category: string;
	} | undefined;
}
