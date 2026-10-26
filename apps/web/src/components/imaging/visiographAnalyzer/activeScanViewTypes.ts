/**
 * activeScanViewTypes.ts — Типы для компонента активного снимка визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import type { useVisiographAnalyzer } from "./useVisiographAnalyzer.js";

export interface VisiographActiveScanViewProps {
	analyzer: ReturnType<typeof useVisiographAnalyzer>;
	toothCode?: string | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}
