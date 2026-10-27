import React from "react";
import { SanPinSterilizationJournal } from "./SanPinSterilizationJournal";
import { useAutoclaveRegisterLogic } from "./autoclave/useAutoclaveRegisterLogic";
import { AutoclaveRegisterModals } from "./autoclave/AutoclaveRegisterModals";

export function AutoclaveRegisterTab() {
	const logic = useAutoclaveRegisterLogic();

	return (
		<div className="sanpin-tab-content">
			<SanPinSterilizationJournal
				onOpenEquipmentModal={() => logic.setIsEquipmentModalOpen(true)}
				onOpenNewCycleModal={() => logic.setIsNewCycleModalOpen(true)}
			/>

			<AutoclaveRegisterModals
				isKraftModalOpen={logic.isKraftModalOpen} setIsKraftModalOpen={logic.setIsKraftModalOpen}
				isJournal257ModalOpen={logic.isJournal257ModalOpen} setIsJournal257ModalOpen={logic.setIsJournal257ModalOpen}
				isNewCycleModalOpen={logic.isNewCycleModalOpen} setIsNewCycleModalOpen={logic.setIsNewCycleModalOpen}
				isWasteJournalOpen={logic.isWasteJournalOpen} setIsWasteJournalOpen={logic.setIsWasteJournalOpen}
				isEquipmentModalOpen={logic.isEquipmentModalOpen} setIsEquipmentModalOpen={logic.setIsEquipmentModalOpen}
				kraftPrefill={logic.kraftPrefill} clinicDevices={logic.clinicDevices} onCycleCreated={logic.fetchLogs} onEquipmentUpdated={logic.fetchDevices}
			/>
		</div>
	);
}

export { AutoclaveRegisterTab as SanpinAutoclaveRegisterTab };
export default AutoclaveRegisterTab;
