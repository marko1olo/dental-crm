import React from "react";
import { KraftPackageBarcodeModal } from "../kraft/KraftPackageBarcodeModal";
import { AutoclaveSterilizationLogModal } from "../autoclaveLog/AutoclaveSterilizationLogModal";
import { MedicalWasteJournalModal } from "../waste/MedicalWasteJournalModal";
import { SterilizerEquipmentModal } from "../SterilizerEquipmentModal";
import { SterilizationCycleDrawer } from "../sterilization/SterilizationCycleDrawer";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes";

export interface AutoclaveRegisterModalsProps {
	readonly isKraftModalOpen: boolean;
	readonly setIsKraftModalOpen: (open: boolean) => void;
	readonly isSterilizationLogModalOpen?: boolean;
	readonly setIsSterilizationLogModalOpen?: (open: boolean) => void;
	readonly isJournal257ModalOpen?: boolean;
	readonly setIsJournal257ModalOpen?: (open: boolean) => void;
	readonly isNewCycleModalOpen: boolean;
	readonly setIsNewCycleModalOpen: (open: boolean) => void;
	readonly isWasteJournalOpen: boolean;
	readonly setIsWasteJournalOpen: (open: boolean) => void;
	readonly isEquipmentModalOpen: boolean;
	readonly setIsEquipmentModalOpen: (open: boolean) => void;
	readonly kraftPrefill: {
		autoclaveId?: string | undefined;
		cycleNumber?: number | undefined;
		operatorName?: string | undefined;
	};
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly onCycleCreated: () => void;
	readonly onEquipmentUpdated: () => void;
}

export const AutoclaveRegisterModals: React.FC<AutoclaveRegisterModalsProps> = ({
	isKraftModalOpen,
	setIsKraftModalOpen,
	isSterilizationLogModalOpen,
	setIsSterilizationLogModalOpen,
	isJournal257ModalOpen,
	setIsJournal257ModalOpen,
	isNewCycleModalOpen,
	setIsNewCycleModalOpen,
	isWasteJournalOpen,
	setIsWasteJournalOpen,
	isEquipmentModalOpen,
	setIsEquipmentModalOpen,
	kraftPrefill,
	clinicDevices,
	onCycleCreated,
	onEquipmentUpdated,
}) => {
	const isLogModalOpen = Boolean(isSterilizationLogModalOpen ?? isJournal257ModalOpen);
	const handleCloseLogModal = () => {
		setIsSterilizationLogModalOpen?.(false);
		setIsJournal257ModalOpen?.(false);
	};
	return (
		<>
			<KraftPackageBarcodeModal
				isOpen={isKraftModalOpen}
				initialAutoclaveId={kraftPrefill.autoclaveId}
				initialCycleNumber={kraftPrefill.cycleNumber}
				initialOperatorName={kraftPrefill.operatorName}
				onClose={() => setIsKraftModalOpen(false)}
			/>

			<AutoclaveSterilizationLogModal
				isOpen={isLogModalOpen}
				initialTab="sterilization_log"
				onClose={handleCloseLogModal}
			/>

			<SterilizationCycleDrawer
				isOpen={isNewCycleModalOpen}
				onClose={() => setIsNewCycleModalOpen(false)}
				onCycleApproved={onCycleCreated}
				clinicDevices={clinicDevices}
			/>

			<MedicalWasteJournalModal
				isOpen={isWasteJournalOpen}
				onClose={() => setIsWasteJournalOpen(false)}
			/>

			<SterilizerEquipmentModal
				isOpen={isEquipmentModalOpen}
				onClose={() => setIsEquipmentModalOpen(false)}
				onSuccess={onEquipmentUpdated}
			/>
		</>
	);
};
