import React from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { BactericidalAddEquipmentModal } from "./BactericidalAddEquipmentModal";
import { BactericidalFleetGrid } from "./BactericidalFleetGrid";
import { BactericidalLogTable } from "./BactericidalLogTable";
import { handlePrintBactericidalJournal } from "./bactericidalShiftHelpers";
import { BactericidalAirPrepBanner } from "./bactericidal/BactericidalAirPrepBanner";
import { BactericidalFleetHeader } from "./bactericidal/BactericidalFleetHeader";
import { BactericidalZeroSetupBanner } from "./bactericidal/BactericidalZeroSetupBanner";
import { useBactericidalState } from "./bactericidal/useBactericidalState";
import { useNewEquipmentForm } from "./bactericidal/useNewEquipmentForm";

export {
	CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET,
	provisionCanonicalBactericidalEquipment,
} from "./bactericidal/bactericidalPresets";

export function BactericidalRegisterTab() {
	const appLogic = useOptionalAppLogicContext();
	const state = useBactericidalState();
	const equipForm = useNewEquipmentForm({
		onSuccess: () => {
			state.setIsEquipModalOpen(false);
			state.fetchAll();
		},
	});

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>Обеззараживание воздуха и УФ-облучатели</h2>
				<p>Учет наработки ламп и дезинфекция воздуха кабинетов</p>
			</div>

			<BactericidalAirPrepBanner
				submitting={state.submitting}
				onOpenMorningShift={state.handleOpenMorningShift}
				onCloseEveningShift={state.handleCloseEveningShift}
			/>

			<BactericidalFleetHeader
				equipmentCount={state.equipments.length}
				submitting={state.submitting}
				onOpenAddEquipModal={() => state.setIsEquipModalOpen(true)}
				onOpenLogModal={() => state.handlePreShift30Min()}
			/>

			{state.equipments.length === 0 && (
				<BactericidalZeroSetupBanner
					submitting={state.submitting}
					onProvisionCanonicalEquipment={() => state.handleProvisionCanonicalEquipment(true)}
				/>
			)}

			<BactericidalFleetGrid
				equipments={state.equipments}
				onPreShift30Min={state.handlePreShift30Min}
				onReplaceLamps={state.handleReplaceLamps}
				submitting={state.submitting}
			/>

			<BactericidalLogTable
				logs={state.filteredLogs}
				equipments={state.equipments}
				selectedEquipId={state.selectedEquipId}
				setSelectedEquipId={state.setSelectedEquipId}
				loading={state.loading}
				onPrintJournal={() =>
					handlePrintBactericidalJournal({
						equipments: state.equipments,
						selectedEquipId: state.selectedEquipId,
						logs: state.logs,
						operatorStaffFullName:
							(appLogic as any)?.activeDoctor?.fullName ||
							(appLogic as any)?.activeDoctor?.name ||
							"Медсестра ЦСО",
					})
				}
			/>

			<BactericidalAddEquipmentModal
				isOpen={state.isEquipModalOpen}
				onClose={() => state.setIsEquipModalOpen(false)}
				newRoomName={equipForm.newRoomName}
				setNewRoomName={equipForm.setNewRoomName}
				newRoomVolume={equipForm.newRoomVolume}
				setNewRoomVolume={equipForm.setNewRoomVolume}
				newDeviceBrand={equipForm.newDeviceBrand}
				setNewDeviceBrand={equipForm.setNewDeviceBrand}
				newSerialNumber={equipForm.newSerialNumber}
				setNewSerialNumber={equipForm.setNewSerialNumber}
				newDeviceType={equipForm.newDeviceType}
				setNewDeviceType={equipForm.setNewDeviceType}
				newMaxHours={equipForm.newMaxHours}
				setNewMaxHours={equipForm.setNewMaxHours}
				onSubmit={equipForm.handleAddEquipment}
				submitting={equipForm.isSubmitting}
			/>
		</div>
	);
}

export * from "./BactericidalAddEquipmentModal";
export * from "./BactericidalFleetGrid";
export * from "./BactericidalLogTable";
export * from "./bactericidalShiftHelpers";
