import React from "react";
import { MedicalWasteAddEntryModal } from "./waste/MedicalWasteAddEntryModal";
import { MedicalWasteControlBar } from "./waste/MedicalWasteControlBar";
import { MedicalWasteJournalModal } from "./waste/MedicalWasteJournalModal";
import { MedicalWasteKpiGrid } from "./waste/MedicalWasteKpiGrid";
import { MedicalWasteMovementsTable } from "./waste/MedicalWasteMovementsTable";
import { useMedicalWasteTabState } from "./waste/useMedicalWasteTabState";

export function MedicalWasteRegisterTab() {
	const {
		loading,
		searchQuery,
		setSearchQuery,
		classFilter,
		setClassFilter,
		isModalOpen,
		setIsModalOpen,
		isWasteJournalModalOpen,
		setIsWasteJournalModalOpen,
		isQuickShiftLoading,
		handleQuickShiftWaste,
		fetchLogs,
		summaryStats,
		filteredLogs,
	} = useMedicalWasteTabState();

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>УТИЛИЗАЦИЯ ОТХОДОВ</h2>
				<p title="Учет образования и передачи отходов">Учет образования и передачи отходов клиники</p>
			</div>

			<MedicalWasteKpiGrid stats={summaryStats} />

			<MedicalWasteControlBar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				classFilter={classFilter}
				setClassFilter={setClassFilter}
				handleQuickShiftWaste={handleQuickShiftWaste}
				isQuickShiftLoading={isQuickShiftLoading}
				onOpenWasteJournalModal={() => setIsWasteJournalModalOpen(true)}
				onOpenAddEntryModal={() => setIsModalOpen(true)}
			/>

			<MedicalWasteMovementsTable loading={loading} logs={filteredLogs} />

			<MedicalWasteAddEntryModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={fetchLogs}
			/>

			<MedicalWasteJournalModal
				isOpen={isWasteJournalModalOpen}
				onClose={() => setIsWasteJournalModalOpen(false)}
			/>
		</div>
	);
}
