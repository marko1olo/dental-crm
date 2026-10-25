import React, { useId } from "react";
import { showToast } from "../GlobalToast";
import type { FastImplantPassportData } from "./implantQuickPresets";
import { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS } from "./implantConstants";
export { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS };
import { useImplantPassportLogic, type ImplantModalTab } from "./modal/useImplantPassportLogic";
import { useImplantModalHandlers } from "./modal/useImplantModalHandlers";
import { PassportHeader } from "./modal/PassportHeader";
import { ImplantPassportModalNav } from "./modal/ImplantPassportModalNav";
import { PassportModalBody } from "./modal/PassportModalBody";
import { PassportPrintActions } from "./modal/PassportPrintActions";
import "./implants.css";

export interface ImplantPassportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTooth?: number | undefined;
	readonly initialTab?: (ImplantModalTab | "isq") | undefined;
	readonly inventoryOverdraftActive?: boolean | undefined;
	readonly onSavePassport?: ((data: FastImplantPassportData) => void) | undefined;
	readonly onInsertIntoDiary?: ((diaryText: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const ImplantPassportModal: React.FC<ImplantPassportModalProps> = ({
	isOpen, onClose, patientName = "Пациент", patientId = "PAT-01",
	doctorName = "Хирург-имплантолог", doctorId = "DOC-01", initialTooth = 46,
	initialTab = "protocol", inventoryOverdraftActive = false,
	onSavePassport, onInsertIntoDiary, className = "",
}) => {
	const titleId = useId();
	const logic = useImplantPassportLogic({
		isOpen, initialTooth, initialTab, inventoryOverdraftActive,
		patientName, patientId, doctorName, doctorId, onSavePassport, onInsertIntoDiary, onClose,
	});
	const handlers = useImplantModalHandlers(logic, patientId, onSavePassport, onInsertIntoDiary, onClose);

	const handlePrintPassport = () => {
		logic.setActiveTab("passport");
		setTimeout(() => {
			window.print?.();
			showToast(`Печать паспорта #${logic.toothFdi}`, "success");
		}, 100);
	};

	if (!isOpen) return null;

	return (
		<div className="implant-passport-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="implant-passport-modal-backdrop">
			<div className={`implant-passport-card-container implant-surgical-passport-modal ${className}`.trim()} data-testid="implant-passport-modal">
				<PassportHeader
					titleId={titleId} toothFdi={logic.toothFdi} patientName={patientName} doctorName={doctorName} activeTab={logic.activeTab}
					onTogglePassportView={() => logic.setActiveTab(logic.activeTab === "passport" ? "protocol" : "passport")}
					onPrintPassport={handlePrintPassport} onClose={onClose}
				/>
				<ImplantPassportModalNav activeTab={logic.activeTab} setActiveTab={logic.setActiveTab} torqueNcm={logic.torqueNcm} />
				<PassportModalBody logic={logic} handlers={handlers} inventoryOverdraftActive={inventoryOverdraftActive} />
				<PassportPrintActions
					brand={logic.selectedSystem.brand} diameterMm={logic.diameterMm} lengthMm={logic.lengthMm}
					torqueNcm={logic.torqueNcm} onPrint={handlePrintPassport} onSave={handlers.handleSaveAndInsertDiary}
				/>
			</div>
		</div>
	);
};

export default ImplantPassportModal;
