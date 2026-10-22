import React, { useEffect } from "react";
import { type PeriodPreset } from "./retroactiveSanpinEngine";
import { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";
import { RetroactiveBatchHeroBanner } from "./RetroactiveBatchHeroBanner";
import { RetroactiveBatchTable } from "./RetroactiveBatchTable";
import { useSanpinScheduleSyncLogic } from "../../hooks/domains/useSanpinScheduleSyncLogic";
import { RetroactiveBatchKpiGrid } from "./retroactive/RetroactiveBatchKpiGrid";
import { RetroactiveBatchControlBar } from "./retroactive/RetroactiveBatchControlBar";
import { RetroactiveBatchFloatingBar } from "./retroactive/RetroactiveBatchFloatingBar";
import { useRetroactiveSterilizers } from "./retroactive/useRetroactiveSterilizers";
import { useRetroactiveDayCycle } from "./retroactive/useRetroactiveDayCycle";
import { useRetroactiveInlineEditing } from "./retroactive/useRetroactiveInlineEditing";
import { useRetroactiveBatchState } from "./retroactive/useRetroactiveBatchState";

export interface RetroactiveBatchTabProps {
	readonly initialPreset?: PeriodPreset | undefined;
	readonly onSuccess?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly isModal?: boolean | undefined;
}

export function RetroactiveBatchTab({
	initialPreset = "current_month",
	onSuccess,
	onClose,
	isModal = false,
}: RetroactiveBatchTabProps = {}) {
	const sterilizers = useRetroactiveSterilizers();
	const dayCycle = useRetroactiveDayCycle({
		availableSterilizers: sterilizers.availableSterilizers, sterilizerModel: sterilizers.sterilizerModel, onSuccess,
	});
	const batch = useRetroactiveBatchState({
		initialPreset, sterilizerModel: sterilizers.sterilizerModel, onSuccess,
	});
	const editing = useRetroactiveInlineEditing({ setGeneratedDays: batch.setGeneratedDays });
	const scheduleSync = useSanpinScheduleSyncLogic({
		defaultStartDate: batch.customStartDate, defaultEndDate: batch.customEndDate,
	});

	useEffect(() => {
		sterilizers.fetchSterilizers();
		batch.handleGenerateBatch();
	}, []);

	return (
		<div className="sanpin-tab-content" style={{ gap: "1.25rem" }}>
			<RetroactiveBatchHeroBanner
				periodPreset={batch.periodPreset}
				setPeriodPreset={batch.setPeriodPreset}
				customStartDate={batch.customStartDate}
				setCustomStartDate={batch.setCustomStartDate}
				customEndDate={batch.customEndDate}
				setCustomEndDate={batch.setCustomEndDate}
				selectedCabinetIds={batch.selectedCabinetIds}
				toggleCabinet={batch.toggleCabinet}
				selectAllCabinets={batch.selectAllCabinets}
				nurseFullName={batch.nurseFullName}
				setNurseFullName={batch.setNurseFullName}
				sterilizerModel={sterilizers.sterilizerModel}
				setSterilizerModel={sterilizers.setSterilizerModel}
				availableSterilizers={sterilizers.availableSterilizers}
				onOpenEquipmentModal={() => sterilizers.setIsEquipmentModalOpen(true)}
				autoclaveRegimeId={batch.autoclaveRegimeId}
				setAutoclaveRegimeId={batch.setAutoclaveRegimeId}
				onGenerateBatch={batch.handleGenerateBatch}
				onRecordDayCycle={dayCycle.handleRecordDayAutoclaveCycle}
				isLoggingDayCycle={dayCycle.isLoggingDayCycle}
			/>

			{batch.isGenerated && <RetroactiveBatchKpiGrid stats={batch.stats} />}

			{batch.isGenerated && (
				<RetroactiveBatchControlBar
					searchQuery={batch.searchQuery}
					setSearchQuery={batch.setSearchQuery}
					filterOnlyWorkdays={batch.filterOnlyWorkdays}
					setFilterOnlyWorkdays={batch.setFilterOnlyWorkdays}
					isLoggingDayCycle={dayCycle.isLoggingDayCycle}
					onRecordDayAutoclaveCycle={dayCycle.handleRecordDayAutoclaveCycle}
					isSaving={batch.isSaving}
					onSaveToRegisters={batch.handleSaveToRegisters}
					onPrintDossier={batch.handlePrintDossier}
					onExportCsv={batch.handleExportCsv}
					onExportScheduleSyncCsv={scheduleSync.handleExportCsv}
					isModal={isModal}
				/>
			)}

			{batch.isGenerated && (
				<RetroactiveBatchTable
					filteredDays={batch.filteredDays}
					editingDayId={editing.editingDayId}
					editFormData={editing.editFormData}
					setEditFormData={editing.setEditFormData}
					onStartEditing={editing.startEditing}
					onSaveEditing={editing.saveEditing}
					onCancelEditing={editing.cancelEditing}
					onRequestDeleteDay={editing.requestDeleteDay}
					onConfirmDeleteDay={editing.confirmDeleteDay}
					onCancelDeleteDay={editing.cancelDeleteDay}
					pendingDeleteDayId={editing.pendingDeleteDayId}
				/>
			)}

			<SterilizerEquipmentModal
				isOpen={sterilizers.isEquipmentModalOpen}
				onClose={() => { sterilizers.setIsEquipmentModalOpen(false); sterilizers.fetchSterilizers(); }}
				onSuccess={sterilizers.fetchSterilizers}
			/>

			<RetroactiveBatchFloatingBar
				isLoggingDayCycle={dayCycle.isLoggingDayCycle}
				onRecordDayCycle={dayCycle.handleRecordDayAutoclaveCycle}
			/>
		</div>
	);
}

export * from "./RetroactiveBatchHeroBanner";
export * from "./RetroactiveBatchTable";
