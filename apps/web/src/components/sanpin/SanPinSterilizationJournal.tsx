/**
 * apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx
 *
 * Мастер-фасад журнала автоклавирования и стерилизации.
 * Модульная декомпозиция (строго <= 120 строк).
 */

import React, { useState } from "react";
import { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";
import { SterilizationCycleDrawer } from "./sterilization/SterilizationCycleDrawer";
import {
	useSanPinJournalLogic,
	SanPinJournalToolbar,
	SanPinCyclesTable,
	SanPinScannerModal,
	type SanPinSterilizationJournalProps,
} from "./journalModules";

export type { SanPinCycleEntry, SanPinSterilizationJournalProps } from "./journalModules";
export { DEFAULT_CYCLES, useSanPinJournalLogic, SanPinJournalToolbar, SanPinCyclesTable } from "./journalModules";

export const SanPinSterilizationJournal: React.FC<SanPinSterilizationJournalProps> = ({
	onAttachPouchToVisit,
	initialFilterAutoclave = "all",
	className = "",
	onOpenEquipmentModal,
	onOpenNewCycleModal,
}) => {
	const [internalEquipmentModalOpen, setInternalEquipmentModalOpen] = useState(false);
	const [internalNewCycleModalOpen, setInternalNewCycleModalOpen] = useState(false);

	const {
		period,
		setPeriod,
		selectedAutoclave,
		setSelectedAutoclave,
		searchQuery,
		setSearchQuery,
		directScanCode,
		setDirectScanCode,
		isAutofilling,
		showScannerModal,
		setShowScannerModal,
		filteredCycles,
		fetchCyclesFromDb,
		handleAutofillNorms,
		handleQuickBatchNorm,
		handleQuickPsoNorm,
		handleQuickChairsideScan,
		handlePrint257,
		handleExportCsv,
	} = useSanPinJournalLogic({ onAttachPouchToVisit, initialFilterAutoclave });

	const handleOpenEquipment = onOpenEquipmentModal || (() => setInternalEquipmentModalOpen(true));
	const handleOpenNewCycle = onOpenNewCycleModal || (() => setInternalNewCycleModalOpen(true));

	return (
		<div className={`sanpin-sterilization-journal ${className}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<SanPinJournalToolbar
				period={period}
				onPeriodChange={setPeriod}
				onQuickBatchNorm={handleQuickBatchNorm}
				onQuickPsoNorm={handleQuickPsoNorm}
				selectedAutoclave={selectedAutoclave}
				onSelectAutoclave={setSelectedAutoclave}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				directScanCode={directScanCode}
				onDirectScanChange={setDirectScanCode}
				onDirectScanSubmit={handleQuickChairsideScan}
				isAutofilling={isAutofilling}
				onAutofillNorms={() => handleAutofillNorms("month")}
				onOpenScannerModal={() => setShowScannerModal(true)}
				onPrintForm257={handlePrint257}
				onExportCsv={handleExportCsv}
				onOpenEquipmentModal={handleOpenEquipment}
				onOpenNewCycleModal={handleOpenNewCycle}
			/>

			<SanPinCyclesTable
				cycles={filteredCycles}
				onAutofillShift={() => handleAutofillNorms("shift")}
				isAutofilling={isAutofilling}
				onQuickBatchNorm={handleQuickBatchNorm}
				onQuickPsoNorm={handleQuickPsoNorm}
			/>

			<SanPinScannerModal
				isOpen={showScannerModal}
				onClose={() => setShowScannerModal(false)}
				onAttachPouchToVisit={onAttachPouchToVisit}
			/>

			<SterilizerEquipmentModal isOpen={internalEquipmentModalOpen} onClose={() => setInternalEquipmentModalOpen(false)} />
			<SterilizationCycleDrawer
				isOpen={internalNewCycleModalOpen}
				onClose={() => setInternalNewCycleModalOpen(false)}
				onCycleApproved={() => void fetchCyclesFromDb()}
			/>
		</div>
	);
};

export default SanPinSterilizationJournal;
