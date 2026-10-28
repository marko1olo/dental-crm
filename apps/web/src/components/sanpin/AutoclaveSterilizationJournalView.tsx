/**
 * apps/web/src/components/sanpin/AutoclaveSterilizationJournalView.tsx
 *
 * Легковесный фасад канонического журнала автоклавирования (Мандат 8b/8zi).
 * Делегирует в AutoclaveJournalTab для предотвращения дублирования кода.
 */

import React from "react";
import { AutoclaveJournalTab, type AutoclaveJournalTabProps } from "./AutoclaveJournalTab";

export type AutoclaveSterilizationJournalViewProps = AutoclaveJournalTabProps;

export const AutoclaveSterilizationJournalView: React.FC<AutoclaveSterilizationJournalViewProps> = (props) => {
	return <AutoclaveJournalTab {...props} />;
};

AutoclaveSterilizationJournalView.displayName = "AutoclaveSterilizationJournalView";
export default AutoclaveSterilizationJournalView;
