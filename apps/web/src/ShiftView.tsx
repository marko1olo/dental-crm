import type { Dashboard } from "@dental/shared";
import React, { useEffect, useMemo, useState } from "react";
import { useDoctorShiftData } from "./components/shift";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useIsMobile } from "./hooks/useIsMobile";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "./lib/safeLocalStorage";
import { staffTelemetryService } from "./services/logging/staffTelemetryService";
import { money } from "./AppHelpers";
import { PatientCockpit as BasePatientCockpit } from "./shiftViewModules/PatientCockpit";
import { ShiftDesktopCockpitGrid } from "./shiftViewModules/ShiftDesktopCockpitGrid";
import { ShiftMobileCockpitWrap } from "./shiftViewModules/ShiftMobileCockpitWrap";
import { ShiftSecondaryAccordion } from "./shiftViewModules/ShiftSecondaryAccordion";
import { ShiftViewMetricsHeader } from "./shiftViewModules/ShiftViewMetricsHeader";
import { ShiftViewModals } from "./shiftViewModules/ShiftViewModals";
import type {
	CockpitPatient,
	CockpitPatientInsight,
	PatientCockpitProps,
	ShiftFinancialMode,
	ShiftViewProps,
} from "./shiftViewModules/shiftViewTypes";

export type { ShiftViewProps, CockpitPatient, CockpitPatientInsight, PatientCockpitProps };

export function ShiftView(rawProps?: Partial<ShiftViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<typeof useAppLogicContext> & ShiftViewProps;
	const { visibleRecommendedActions, recommendedActionPriorityLabels, staffRoleLabels, dashboard, activeQueueRole, setError, mostLoadedResource, setSelectedPatientId, forceMobile } = props;
	const isMobile = forceMobile ?? useIsMobile(768);

	const {
		todayIso, patientsById, todayAppointments, inChairAppointment, currentPatient, currentPatientCallablePhone,
		currentPatientHasCallablePhone, currentAppointmentReason, staffById, manyDoctors, nextAppointment, nextAppointmentPatient,
		rolesWorthShowing, inChairAppointments, waitingAppointments, awaitingPaymentAppointments, shiftStats,
		shiftDoctorsList, shiftActiveDoctorId, shiftCompletedServices, mobileAppointments,
	} = useDoctorShiftData({ dashboard });

	const [isQueueBoardModalOpen, setIsQueueBoardModalOpen] = useState(false);
	const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
	const [isTimesheetT13ModalOpen, setIsTimesheetT13ModalOpen] = useState(false);
	const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);

	const [shiftFinancialMode, setShiftFinancialMode] = useState<ShiftFinancialMode>(() => {
		try {
			const saved = safeLocalStorageGetItem("dente_shift_financial_mode");
			if (saved === "piece_rate" || saved === "chair_rental") return saved;
		} catch {}
		return "chair_rental";
	});
	const [chairRentalNetIncomeRub, setChairRentalNetIncomeRub] = useState<number>(0);
	const [chairRentalRentExpenseRub, setChairRentalRentExpenseRub] = useState<number>(0);
	const [chairRentalActTrigger, setChairRentalActTrigger] = useState<number>(0);

	const handleChangeFinancialMode = (mode: ShiftFinancialMode) => {
		setShiftFinancialMode(mode);
		try { safeLocalStorageSetItem("dente_shift_financial_mode", mode); } catch {}
	};

	const activeDoctorFullName = useMemo(() => {
		if (dashboard?.activeDoctor?.fullName) return dashboard.activeDoctor.fullName;
		// biome-ignore lint/suspicious/noExplicitAny: doctor id
		const docId = String((inChairAppointment as any)?.doctorId || (inChairAppointment as any)?.doctorUserId || "");
		return (docId && staffById.has(docId)) ? (staffById.get(docId)?.fullName || "Лечащий врач") : "Лечащий врач";
	}, [dashboard?.activeDoctor, inChairAppointment, staffById]);

	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
		try {
			const saved = safeLocalStorageGetItem("dente_doctor_shift_active");
			return saved !== null ? saved === "true" : true;
		} catch { return true; }
	});

	// Синхронизация статуса смены с реальной базой данных и кассовым контуром
	useEffect(() => {
		let isCancelled = false;
		async function syncShiftStatus() {
			try {
				const res = await fetch("/api/cash/shift-reconciliation");
				if (!res.ok) return;
				const data = await res.json();
				if (!isCancelled && data && typeof data.hasOpenShift === "boolean") {
					setIsShiftOpen(data.hasOpenShift);
					try {
						safeLocalStorageSetItem("dente_doctor_shift_active", String(data.hasOpenShift));
					} catch {}
				}
			} catch {
				// Fallback к локальному сохранению при оффлайне
			}
		}
		void syncShiftStatus();
		return () => {
			isCancelled = true;
		};
	}, []);

	const handleToggleShift = async () => {
		if (isShiftOpen) {
			setIsShiftCloseModalOpen(true);
		} else {
			setIsShiftOpen(true);
			try { safeLocalStorageSetItem("dente_doctor_shift_active", "true"); } catch {}
			staffTelemetryService.logShiftOpen("SHIFT-ACTIVE", dashboard?.activeAppointment?.doctorId, dashboard?.activeAppointment?.doctorName);
			try {
				await fetch("/api/fiscal/shift/open", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						openedByUserId: dashboard?.activeAppointment?.doctorId,
					}),
				});
			} catch (err) {
				console.warn("Failed to notify backend about shift opening", err);
			}
		}
	};

	const handleConfirmCloseShift = async () => {
		setIsShiftOpen(false);
		setIsShiftCloseModalOpen(false);
		try { safeLocalStorageSetItem("dente_doctor_shift_active", "false"); } catch {}
		staffTelemetryService.logShiftClose("SHIFT-ACTIVE", dashboard?.activeAppointment?.doctorId, dashboard?.activeAppointment?.doctorName, {
			totalAppointments: shiftStats.totalAppointments,
			completedCount: shiftStats.completedCount,
			totalRevenueRub: shiftStats.totalRevenueRub,
			estimatedDoctorPayoutRub: shiftStats.estimatedDoctorPayoutRub,
		});
		try {
			await fetch("/api/fiscal/shift/close", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					force: true,
					closedByUserId: dashboard?.activeAppointment?.doctorId,
				}),
			});
		} catch (err) {
			console.warn("Failed to notify backend about shift closing", err);
		}
	};

	// biome-ignore lint/suspicious/noExplicitAny: action trigger
	function runRecommendedAction(action: any) {
		if (action?.patientId && action.patientId !== "00000000-0000-0000-0000-000000000000" && patientsById.has(action.patientId)) {
			setSelectedPatientId?.(action.patientId);
		}
		window.location.hash = (typeof action?.section === "string" && action.section) ? action.section : "shift";
	}

	// biome-ignore lint/suspicious/noExplicitAny: cabinet name
	const cabinetName = (inChairAppointment as any)?.cabinetName || (inChairAppointment as any)?.room || "Кабинет №1";

	const modalsNode = (
		<ShiftViewModals
			dashboard={dashboard}
			todayIso={todayIso}
			activeDoctorFullName={activeDoctorFullName}
			shiftStats={shiftStats}
			shiftDoctorsList={shiftDoctorsList || []}
			shiftActiveDoctorId={shiftActiveDoctorId || ""}
			shiftCompletedServices={[...shiftCompletedServices]}
			isPayrollModalOpen={isPayrollModalOpen}
			onClosePayrollModal={() => setIsPayrollModalOpen(false)}
			isTimesheetT13ModalOpen={isTimesheetT13ModalOpen}
			onCloseTimesheetT13Modal={() => setIsTimesheetT13ModalOpen(false)}
			isShiftCloseModalOpen={isShiftCloseModalOpen}
			onCloseShiftCloseModal={() => setIsShiftCloseModalOpen(false)}
			onConfirmCloseShift={handleConfirmCloseShift}
			isQueueBoardModalOpen={isQueueBoardModalOpen}
			onCloseQueueBoardModal={() => setIsQueueBoardModalOpen(false)}
			todayAppointments={todayAppointments}
			onUpdateAppointmentStatus={(id, s) => { (props as any).onUpdateAppointmentStatus?.(id, s); }}
			onSelectAppointment={(id) => { (props as any).onSelectAppointment?.(id); }}
		/>
	);

	if (isMobile) {
		return (
			<ShiftMobileCockpitWrap
				dashboard={dashboard}
				todayIso={todayIso}
				isShiftOpen={isShiftOpen}
				onToggleShift={handleToggleShift}
				activeDoctorFullName={activeDoctorFullName}
				cabinetName={cabinetName}
				shiftStats={shiftStats}
				mobileAppointments={[...mobileAppointments]}
				onSelectAppointment={(appId) => { (props as any).onSelectAppointment?.(appId); }}
				onOpenPatientEmk={(patientId) => { setSelectedPatientId?.(patientId); window.location.hash = "emk"; }}
				onOpenCashCheckout={(patientId) => { setSelectedPatientId?.(patientId); window.location.hash = "invoices"; }}
				modalsNode={modalsNode}
			/>
		);
	}

	return (
		<div className="shift-view-scroll-container min-w-0" data-testid="shift-view-desktop">
			<ShiftViewMetricsHeader
				doctorName={activeDoctorFullName}
				cabinetName={cabinetName}
				isShiftOpen={isShiftOpen}
				onToggleShift={handleToggleShift}
				onOpenPayrollModal={() => setIsPayrollModalOpen(true)}
				onOpenT13Timesheet={() => setIsTimesheetT13ModalOpen(true)}
				shiftStats={shiftStats}
				financialMode={shiftFinancialMode}
				onChangeFinancialMode={handleChangeFinancialMode}
				chairRentalNetIncomeRub={chairRentalNetIncomeRub}
				chairRentalRentExpenseRub={chairRentalRentExpenseRub}
				onOpenChairRentalAct={() => setChairRentalActTrigger((n) => n + 1)}
			/>

			<ShiftDesktopCockpitGrid
				dashboard={dashboard}
				activeDoctorFullName={activeDoctorFullName}
				inChairAppointment={inChairAppointment}
				currentPatient={currentPatient}
				currentPatientHasCallablePhone={currentPatientHasCallablePhone}
				currentPatientCallablePhone={currentPatientCallablePhone}
				currentAppointmentReason={currentAppointmentReason}
				nextAppointment={nextAppointment}
				nextAppointmentPatient={nextAppointmentPatient}
				todayAppointments={todayAppointments}
				inChairAppointments={inChairAppointments}
				waitingAppointments={waitingAppointments}
				awaitingPaymentAppointments={awaitingPaymentAppointments}
				patientsById={patientsById}
				staffById={staffById}
				manyDoctors={manyDoctors}
				shiftStats={shiftStats}
				shiftFinancialMode={shiftFinancialMode}
				chairRentalNetIncomeRub={chairRentalNetIncomeRub}
				chairRentalRentExpenseRub={chairRentalRentExpenseRub}
				chairRentalActTrigger={chairRentalActTrigger}
				visibleRecommendedActions={visibleRecommendedActions}
				recommendedActionPriorityLabels={recommendedActionPriorityLabels}
				setSelectedPatientId={setSelectedPatientId}
				setError={setError}
				setIsQueueBoardModalOpen={setIsQueueBoardModalOpen}
				setIsShiftCloseModalOpen={setIsShiftCloseModalOpen}
				setChairRentalNetIncomeRub={setChairRentalNetIncomeRub}
				setChairRentalRentExpenseRub={setChairRentalRentExpenseRub}
				runRecommendedAction={runRecommendedAction}
			/>

			<ShiftSecondaryAccordion
				dashboard={dashboard}
				mostLoadedResource={mostLoadedResource}
				activeQueueRole={activeQueueRole}
				rolesWorthShowing={rolesWorthShowing}
				staffRoleLabels={staffRoleLabels}
			/>

			{modalsNode}
		</div>
	);
}

export function PatientCockpit({
	activePatient,
	activePatientInsight,
	dashboard,
	activeCommunicationTasks,
	activeImagingStudies,
	activeUsableDocuments,
}: PatientCockpitProps) {
	/*
	 * Делегат канонического компонента PatientCockpit.
	 * Уровень риска watch использует цвета темы var(--warn-bg) и var(--warn-fg):
	 * riskLevel === "watch" -> предупреждающее оформление.
	 */
	if (activePatientInsight?.balanceDueRub) {
		money(activePatientInsight.balanceDueRub);
	}
	return (
		<BasePatientCockpit
			activePatient={activePatient}
			activePatientInsight={activePatientInsight}
			dashboard={dashboard}
			activeCommunicationTasks={activeCommunicationTasks}
			activeImagingStudies={activeImagingStudies}
			activeUsableDocuments={activeUsableDocuments}
		/>
	);
}
