import { ScheduleMobileSheetActions } from "./scheduleMobileSheet/ScheduleMobileSheetActions";
import { ScheduleMobileSheetAdjustControls } from "./scheduleMobileSheet/ScheduleMobileSheetAdjustControls";
import { ScheduleMobileSheetHeader } from "./scheduleMobileSheet/ScheduleMobileSheetHeader";
import { ScheduleMobileSheetPatientInfo } from "./scheduleMobileSheet/ScheduleMobileSheetPatientInfo";
import { ScheduleMobileSheetStatusButtons } from "./scheduleMobileSheet/ScheduleMobileSheetStatusButtons";
import type { ScheduleMobileBottomSheetProps } from "./scheduleMobileSheet/types";
import { useScheduleMobileSheetData } from "./scheduleMobileSheet/useScheduleMobileSheetData";

export function ScheduleMobileBottomSheet(
	props: ScheduleMobileBottomSheetProps,
) {
	const {
		selectedMobileAppt,
		onClose,
		patientName,
		dashboard,
		timezone,
		toDateTimeLocalValue,
		appointmentLabels,
		effectiveChairs,
		doctors,
		onAppointmentClick,
		onQuickStatusChange,
		handleAdjustAppointmentDuration,
		handleShiftAppointmentLateness,
		handleReassignAppointmentChair,
		handleReassignAppointmentDoctor,
		handleFreeSlotToWaitlist,
	} = props;

	const resolved = useScheduleMobileSheetData(
		selectedMobileAppt,
		dashboard,
		timezone,
		patientName,
		toDateTimeLocalValue,
	);

	if (!selectedMobileAppt || !resolved) return null;

	return (
		<div
			className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Подробности приёма"
			tabIndex={-1}
			data-testid="schedule-grid-mobile-bottom-sheet"
		>
			<section
				className="bg-[var(--paper-strong)] rounded-t-3xl border-t border-[var(--line)] p-5 pb-28 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 text-xs text-[var(--ink)]"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				aria-label="Карточка визита"
			>
				<ScheduleMobileSheetHeader
					selectedMobileAppt={selectedMobileAppt}
					mPatName={resolved.mPatName}
					mStart={resolved.mStart}
					mEnd={resolved.mEnd}
					appointmentLabels={appointmentLabels}
					onClose={onClose}
				/>
				<ScheduleMobileSheetPatientInfo
					selectedMobileAppt={selectedMobileAppt}
					mPatName={resolved.mPatName}
					mPatObj={resolved.mPatObj}
					mDocObj={resolved.mDocObj}
					mChairObj={resolved.mChairObj}
					mBalance={resolved.mBalance}
					mAllergyAlert={resolved.mAllergyAlert}
					mTeeth={resolved.mTeeth}
					dashboard={dashboard}
				/>
				<ScheduleMobileSheetStatusButtons
					selectedMobileAppt={selectedMobileAppt}
					onQuickStatusChange={onQuickStatusChange}
					onClose={onClose}
				/>
				<ScheduleMobileSheetAdjustControls
					selectedMobileAppt={selectedMobileAppt}
					effectiveChairs={effectiveChairs}
					doctors={doctors}
					handleAdjustAppointmentDuration={handleAdjustAppointmentDuration}
					handleShiftAppointmentLateness={handleShiftAppointmentLateness}
					handleReassignAppointmentChair={handleReassignAppointmentChair}
					handleReassignAppointmentDoctor={handleReassignAppointmentDoctor}
					handleFreeSlotToWaitlist={handleFreeSlotToWaitlist}
				/>
				<ScheduleMobileSheetActions
					selectedMobileAppt={selectedMobileAppt}
					mPatName={resolved.mPatName}
					onAppointmentClick={onAppointmentClick}
					onQuickStatusChange={onQuickStatusChange}
					onClose={onClose}
				/>
			</section>
		</div>
	);
}
export type { ScheduleMobileBottomSheetProps } from "./scheduleMobileSheet/types";
