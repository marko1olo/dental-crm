import React from "react";
import { useDoctorShiftData } from "./components/shift";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { ShiftDesktopViewWrap } from "./shiftViewModules/ShiftDesktopViewWrap";
import { ShiftMobileCockpitWrap } from "./shiftViewModules/ShiftMobileCockpitWrap";
import { ShiftViewModals } from "./shiftViewModules/ShiftViewModals";
import { useShiftViewController } from "./shiftViewModules/useShiftViewController";
import type {
	CockpitPatient,
	CockpitPatientInsight,
	PatientCockpitProps,
	ShiftFinancialMode,
	ShiftViewProps,
} from "./shiftViewModules/shiftViewTypes";

export { PatientCockpit } from "./shiftViewModules/PatientCockpit";
export type { ShiftViewProps, CockpitPatient, CockpitPatientInsight, PatientCockpitProps };

export function ShiftView(rawProps?: Partial<ShiftViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<typeof useAppLogicContext> & ShiftViewProps;
	const { visibleRecommendedActions, recommendedActionPriorityLabels, staffRoleLabels, dashboard, activeQueueRole, setError, mostLoadedResource, setSelectedPatientId, forceMobile } = props;
	const isMobile = forceMobile ?? useIsMobile(768);
	const userRole = (props as any).selectedWorkspaceRole || "doctor";

	const shiftData = useDoctorShiftData({ dashboard });

	const c = useShiftViewController({
		dashboard,
		inChairAppointment: shiftData.inChairAppointment,
		staffById: shiftData.staffById,
		shiftStats: shiftData.shiftStats,
		patientsById: shiftData.patientsById,
		setSelectedPatientId,
	});

	// biome-ignore lint/suspicious/noExplicitAny: cabinet name
	const cabinetName = (shiftData.inChairAppointment as any)?.cabinetName || (shiftData.inChairAppointment as any)?.room || "Кабинет №1";

	const modalsNode = (
		<ShiftViewModals
			dashboard={dashboard}
			todayIso={shiftData.todayIso}
			activeDoctorFullName={c.activeDoctorFullName}
			shiftStats={shiftData.shiftStats}
			shiftDoctorsList={shiftData.shiftDoctorsList || []}
			shiftActiveDoctorId={shiftData.shiftActiveDoctorId || ""}
			shiftCompletedServices={[...shiftData.shiftCompletedServices]}
			isPayrollModalOpen={c.isPayrollModalOpen}
			onClosePayrollModal={() => c.setIsPayrollModalOpen(false)}
			isTimesheetT13ModalOpen={c.isTimesheetT13ModalOpen}
			onCloseTimesheetT13Modal={() => c.setIsTimesheetT13ModalOpen(false)}
			isShiftCloseModalOpen={c.isShiftCloseModalOpen}
			onCloseShiftCloseModal={() => c.setIsShiftCloseModalOpen(false)}
			onConfirmCloseShift={c.handleConfirmCloseShift}
			isQueueBoardModalOpen={c.isQueueBoardModalOpen}
			onCloseQueueBoardModal={() => {
				c.setIsQueueBoardModalOpen(false);
				if (typeof window !== "undefined" && (window.location.hash.toLowerCase() === "#queue" || window.location.hash.toLowerCase() === "#/queue")) {
					window.location.hash = "shift";
				}
			}}
			todayAppointments={shiftData.todayAppointments}
			onUpdateAppointmentStatus={(id, s) => { (props as any).onUpdateAppointmentStatus?.(id, s); }}
			onSelectAppointment={(id) => { (props as any).onSelectAppointment?.(id); }}
		/>
	);

	if (isMobile) {
		return (
			<ShiftMobileCockpitWrap
				dashboard={dashboard}
				todayIso={shiftData.todayIso}
				isShiftOpen={c.isShiftOpen}
				onToggleShift={c.handleToggleShift}
				activeDoctorFullName={c.activeDoctorFullName}
				cabinetName={cabinetName}
				shiftStats={shiftData.shiftStats}
				mobileAppointments={[...shiftData.mobileAppointments]}
				onSelectAppointment={(appId) => { (props as any).onSelectAppointment?.(appId); }}
				onOpenPatientEmk={(patientId) => { setSelectedPatientId?.(patientId); window.location.hash = "emk"; }}
				onOpenCashCheckout={(patientId) => { setSelectedPatientId?.(patientId); window.location.hash = "invoices"; }}
				modalsNode={modalsNode}
				userRole={userRole}
			/>
		);
	}

	return (
		<ShiftDesktopViewWrap
			dashboard={dashboard}
			activeDoctorFullName={c.activeDoctorFullName}
			cabinetName={cabinetName}
			isShiftOpen={c.isShiftOpen}
			handleToggleShift={c.handleToggleShift}
			setIsPayrollModalOpen={c.setIsPayrollModalOpen}
			setIsTimesheetT13ModalOpen={c.setIsTimesheetT13ModalOpen}
			shiftData={shiftData}
			shiftFinancialMode={c.shiftFinancialMode}
			handleChangeFinancialMode={c.handleChangeFinancialMode}
			chairRentalNetIncomeRub={c.chairRentalNetIncomeRub}
			chairRentalRentExpenseRub={c.chairRentalRentExpenseRub}
			setChairRentalActTrigger={c.setChairRentalActTrigger}
			chairRentalActTrigger={c.chairRentalActTrigger}
			visibleRecommendedActions={visibleRecommendedActions}
			recommendedActionPriorityLabels={recommendedActionPriorityLabels}
			setSelectedPatientId={setSelectedPatientId}
			setError={setError}
			setIsQueueBoardModalOpen={c.setIsQueueBoardModalOpen}
			setIsShiftCloseModalOpen={c.setIsShiftCloseModalOpen}
			setChairRentalNetIncomeRub={c.setChairRentalNetIncomeRub}
			setChairRentalRentExpenseRub={c.setChairRentalRentExpenseRub}
			runRecommendedAction={c.runRecommendedAction}
			mostLoadedResource={mostLoadedResource}
			activeQueueRole={activeQueueRole}
			staffRoleLabels={staffRoleLabels}
			modalsNode={modalsNode}
			userRole={userRole}
		/>
	);
}
