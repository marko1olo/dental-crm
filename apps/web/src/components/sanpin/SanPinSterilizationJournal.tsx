/**
 * apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx
 *
 * Layer 5: Master Facade for SanPin Sterilization Journal (СанПиН 3.3686-21, Форма 257/у).
 * Modularized according to /decomposer DAG architecture (<= 120 lines mandate).
 */

import React, { useState } from "react";
import { showToast } from "../GlobalToast";
import { SterilizationScanner } from "./SterilizationScanner";
import { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";
import { SterilizationCycleModal } from "./SterilizationCycleModal";
import {
	useSanPinJournalLogic,
	SanPinJournalToolbar,
	SanPinCyclesTable,
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

			{showScannerModal && (
				<div
					style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
					onClick={() => setShowScannerModal(false)}
				>
					<div
						style={{ background: "var(--paper, #fff)", borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)", position: "relative" }}
						onClick={(e) => e.stopPropagation()}
					>
						<SterilizationScanner
							onAttachToVisit={(code, snippet) => {
								if (onAttachPouchToVisit) onAttachPouchToVisit(code, snippet);
								showToast(`Крафт-пакет №${code} прикреплен`, "success");
								setShowScannerModal(false);
							}}
							onClose={() => setShowScannerModal(false)}
						/>
					</div>
				</div>
			)}

			<SterilizerEquipmentModal isOpen={internalEquipmentModalOpen} onClose={() => setInternalEquipmentModalOpen(false)} />
			<SterilizationCycleModal isOpen={internalNewCycleModalOpen} onClose={() => setInternalNewCycleModalOpen(false)} onCycleCreated={fetchCyclesFromDb} />
		</div>
	);
};
