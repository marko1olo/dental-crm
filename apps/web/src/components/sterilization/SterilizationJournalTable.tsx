/**
 * apps/web/src/components/sterilization/SterilizationJournalTable.tsx
 *
 * Журнал работы стерилизаторов (DENTE Apple HIG).
 * Мандат 8x: Человеческий язык без советского канцелярита и номеров приказов.
 * Мандат 8e: Автономия врача и медсестры ЦСО, быстрые действия в 1 клик.
 * Мандат 8b: строго <= 120 строк.
 */

import React, { useMemo, useState } from "react";
import { SanPinCyclesTable } from "../sanpin/journalModules/SanPinCyclesTable";
import { DEFAULT_CYCLES } from "../sanpin/journalModules/sanpinDefaultCycles";
import type { SanPinCycleEntry } from "../sanpin/journalModules/sanpinJournalTypes";
import { SterilizationJournalToolbar } from "./SterilizationJournalToolbar";

export interface SterilizationJournalTableProps {
	readonly cycles?: readonly SanPinCycleEntry[] | undefined;
	readonly onOpenNewCycle?: (() => void) | undefined;
	readonly onQuickBatchShift?: (() => void) | undefined;
	readonly onPrintJournal?: (() => void) | undefined;
	readonly onExportCsv?: (() => void) | undefined;
	readonly isAutofilling?: boolean | undefined;
	readonly className?: string | undefined;
}

export function SterilizationJournalTable({
	cycles = DEFAULT_CYCLES,
	onOpenNewCycle,
	onQuickBatchShift,
	onPrintJournal,
	onExportCsv,
	isAutofilling = false,
	className = "",
}: SterilizationJournalTableProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDevice, setSelectedDevice] = useState("all");

	const filteredCycles = useMemo(() => {
		return cycles.filter((cyc) => {
			if (selectedDevice !== "all" && cyc.autoclaveCode !== selectedDevice)
				return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const text =
					`${cyc.date} ${cyc.autoclaveCode} ${cyc.autoclaveModel} ${cyc.itemsSummary} ${cyc.operatorName} ${cyc.regimeName}`.toLowerCase();
				if (!text.includes(q)) return false;
			}
			return true;
		});
	}, [cycles, selectedDevice, searchQuery]);

	return (
		<div
			className={`sterilization-journal-table-root flex flex-col gap-3.5 ${className}`}
			style={{ maxWidth: "100%", overflowX: "clip" }}
		>
			<SterilizationJournalToolbar
				searchQuery={searchQuery}
				onSearchQueryChange={setSearchQuery}
				selectedDevice={selectedDevice}
				onSelectedDeviceChange={setSelectedDevice}
				onQuickBatchShift={onQuickBatchShift}
				onOpenNewCycle={onOpenNewCycle}
				onPrintJournal={onPrintJournal}
				onExportCsv={onExportCsv}
				isAutofilling={isAutofilling}
			/>
			<SanPinCyclesTable
				cycles={filteredCycles}
				isAutofilling={isAutofilling}
				{...(onQuickBatchShift ? { onAutofillShift: onQuickBatchShift } : {})}
			/>
		</div>
	);
}

export default SterilizationJournalTable;
