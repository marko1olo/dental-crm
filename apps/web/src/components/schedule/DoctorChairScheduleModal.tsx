/**
 * DENTE Dental CRM — Doctor-to-Chair Schedule Assignment Modal Facade (DoctorChairScheduleModal.tsx)
 *
 * StomX / DentalPRO Parity:
 * - 1-Click shift assignment (Morning 08–14, Morning-9 09–15, Evening 14–20, Evening-15 15–21, Full 08–20, 2 Shifts)
 * - 1-Click multi-day rotation templates (2/2, 5/2, Even/Odd, Full week)
 * - Solo Doctor & Small Clinic Sovereignty (Mandate 8n): 1-click default anchor button
 * - Mandate 8e: Doctor Autonomy (0 disabled buttons, non-blocking flow)
 * - Mandate 8d: Apple HIG & Medical Density (touch targets >= 44x44px, 0 cartoon emojis)
 * - Anti-Matryoshka Sin 6: Modal depth strictly 1 (inline doctor addition without nested dialogs)
 */

import React from "react";
import { createPortal } from "react-dom";
import type { DoctorChairScheduleModalProps } from "./doctorChairSchedule/types";
import {
	useDoctorChairScheduleModalState,
	DoctorChairScheduleHeader,
	DoctorChairShiftSelector,
	DoctorChairScheduleGrid,
	DoctorChairFooterActions,
} from "./doctorChairSchedule";

export type { DoctorChairScheduleModalProps };

export const DoctorChairScheduleModal: React.FC<DoctorChairScheduleModalProps> = (props) => {
	const { isOpen, onClose, dateKey, doctors = [], isSoloDoctor = false } = props;
	const state = useDoctorChairScheduleModalState(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="chair-doctor-modal-title"
			data-testid="chair-doctor-assignment-modal"
		>
			<div
				className="bg-[var(--paper,#ffffff)] border-2 border-[var(--teal,#0d9488)] rounded-3xl p-4 sm:p-6 shadow-2xl max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-150 text-[var(--ink,#0f172a)]"
				onClick={(e) => e.stopPropagation()}
			>
				<DoctorChairScheduleHeader
					activeChair={state.activeChair}
					dateKey={dateKey}
					onClose={onClose}
					isSoloDoctor={isSoloDoctor}
					doctors={doctors}
					onSoloDoctorQuickAnchor={state.handleSoloDoctorQuickAnchor}
				/>

				<DoctorChairScheduleGrid
					activeTab={state.activeTab}
					onSelectTab={state.setActiveTab}
					selectedShiftPreset={state.selectedShiftPreset}
					rangeStartDate={state.rangeStartDate}
					onChangeRangeStartDate={state.setRangeStartDate}
					rangeEndDate={state.rangeEndDate}
					onChangeRangeEndDate={state.setRangeEndDate}
					rangeRotationPreset={state.rangeRotationPreset}
					onSelectRangeRotationPreset={state.setRangeRotationPreset}
				/>

				{state.activeTab === "day" && (
					<DoctorChairShiftSelector
						selectedShiftPreset={state.selectedShiftPreset}
						onSelectShiftPreset={state.setSelectedShiftPreset}
						doctors={doctors}
						selectedDoctorId={state.selectedDoctorId}
						onSelectDoctorId={state.setSelectedDoctorId}
						selectedEveningDoctorId={state.selectedEveningDoctorId}
						onSelectEveningDoctorId={state.setSelectedEveningDoctorId}
						isInlineDoctorFormOpen={state.isInlineDoctorFormOpen}
						onToggleInlineDoctorForm={() => state.setIsInlineDoctorFormOpen((prev) => !prev)}
						newDocName={state.newDocName}
						onChangeNewDocName={state.setNewDocName}
						newDocSpecialty={state.newDocSpecialty}
						onChangeNewDocSpecialty={state.setNewDocSpecialty}
						onSubmitInlineDoctor={state.handleInlineDoctorSubmit}
					/>
				)}

				<DoctorChairFooterActions
					hasActiveAssignment={state.hasActiveAssignment}
					onUnassign={state.handleUnassign}
					onClose={onClose}
					onConfirm={
						state.activeTab === "day"
							? state.handleConfirmDayAssignment
							: state.handleConfirmDateRange
					}
				/>
			</div>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};

export default DoctorChairScheduleModal;
