/**
 * apps/web/src/components/sanpin/AutoclaveJournalTab.tsx
 *
 * Канонический алиас журнала автоклавирования и стерилизации (Мандаты 8b, 8e, 8n, 8x).
 * Делегирует объединенному мастер-экрану SanPinSterilizationJournal.tsx.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import {
	SanPinSterilizationJournal,
	type SanPinSterilizationJournalProps,
} from "./SanPinSterilizationJournal";

export type AutoclaveJournalTabProps = SanPinSterilizationJournalProps;

export const AutoclaveJournalTab: React.FC<AutoclaveJournalTabProps> = (props) => {
	return <SanPinSterilizationJournal {...props} />;
};

export default AutoclaveJournalTab;
