import type { Dashboard } from "@dental/shared";
import {
	Calendar,
	CheckCircle2,
	ClipboardCheck,
	CreditCard,
	FileText,
	History,
	ImageIcon,
	Info,
	MessageSquare,
	Monitor,
	Phone,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { patientInsightRiskLabels } from "./AppConstants";
import { formatShortDate, money } from "./AppHelpers";
import { PatientAvatar } from "./components/PatientAvatar";
import { TodayQueueBoard } from "./components/schedule/TodayQueueBoard";
import {
	DoctorCabinetHandoverCard,
	DoctorShiftCashSection,
	DoctorShiftCloseModal,
	DoctorShiftControlBar,
	DoctorShiftHeroCard,
	DoctorShiftVisitsKpiSection,
	MobileShiftCockpit,
	PatientCockpitFeatureGrid,
	ShiftCallout,
	ShiftIntelligenceSection,
	ShiftTodoListSection,
	formatClockTime,
	useDoctorShiftData,
} from "./components/shift";
import { useIsMobile } from "./hooks/useIsMobile";
import { DoctorKickoffWidget } from "./components/dashboard/DoctorKickoffWidget";
import { DoctorShiftEarningsWidget } from "./components/doctor/DoctorShiftEarningsWidget";
import { EmkControlBoard } from "./components/visit/EmkControlBoard";
import { countLabel } from "./lib/russianPlural";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "./lib/safeLocalStorage";
import { DoctorPayrollModal } from "./components/finance/payroll/DoctorPayrollModal";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { staffTelemetryService } from "./services/logging/staffTelemetryService";

function birthDateLabel(value: unknown): string {
	if (typeof value !== "string" || !value) return "не указана";
	const [year, month, day] = value.slice(0, 10).split("-");
	if (!year || !month || !day || year.length !== 4) return value;
	return `${day}.${month}.${year}`;
}

export type ShiftViewProps = {
	activePatientHasCallablePhone?: boolean;
	activePatientCallablePhone?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	visibleRecommendedActions?: any[];
	recommendedActionPriorityLabels?: Record<string, string>;
	staffRoleLabels?: Record<string, string>;
	dashboard?: Dashboard;
	forceMobile?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activeQueueRole?: any;
	setError?: (err: unknown) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mostLoadedResource?: any;
	setSelectedPatientId?: (id: string | null) => void;
	// biome-ignore lint/suspicious/noExplicitAny: allow extra props
	[key: string]: any;
};

export function ShiftView(rawProps?: Partial<ShiftViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<
		typeof useAppLogicContext
	> &
		ShiftViewProps;
	const {
		visibleRecommendedActions,
		recommendedActionPriorityLabels,
		staffRoleLabels,
		dashboard,
		activeQueueRole,
		setError,
		mostLoadedResource,
		setSelectedPatientId,
		forceMobile,
	} = props;
	const isMobileHook = useIsMobile(768);
	const isMobile = forceMobile ?? isMobileHook;

	const {
		todayIso,
		patientsById,
		todayAppointments,
		inChairAppointment,
		currentPatient,
		currentPatientCallablePhone,
		currentPatientHasCallablePhone,
		currentAppointmentReason,
		staffById,
		manyDoctors,
		nextAppointment,
		nextAppointmentPatient,
		rolesWorthShowing,
		inChairAppointments,
		waitingAppointments,
		awaitingPaymentAppointments,
		shiftStats,
		shiftDoctorsList,
		shiftActiveDoctorId,
		shiftCompletedServices,
		mobileAppointments,
	} = useDoctorShiftData({ dashboard });

	const [isQueueBoardModalOpen, setIsQueueBoardModalOpen] = useState(false);
	const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
	const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);

	const activeDoctorFullName = useMemo(() => {
		if (dashboard?.activeDoctor?.fullName) return dashboard.activeDoctor.fullName;
		const docId = String((inChairAppointment as any)?.doctorId || (inChairAppointment as any)?.doctorUserId || "");
		if (docId && staffById.has(docId)) {
			return staffById.get(docId)?.fullName || "Лечащий врач";
		}
		return "Лечащий врач";
	}, [dashboard?.activeDoctor, inChairAppointment, staffById]);

	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
		try {
			const saved = safeLocalStorageGetItem("dente_doctor_shift_active");
			return saved !== null ? saved === "true" : true;
		} catch (err: unknown) {
			console.warn("[ShiftView] Error reading dente_doctor_shift_active:", err);
			return true;
		}
	});

	const handleToggleShift = () => {
		if (isShiftOpen) {
			setIsShiftCloseModalOpen(true);
		} else {
			setIsShiftOpen(true);
			try {
				safeLocalStorageSetItem("dente_doctor_shift_active", "true");
			} catch (err: unknown) {
				console.warn("[ShiftView] Error saving dente_doctor_shift_active:", err);
			}
			staffTelemetryService.logShiftOpen(
				"SHIFT-ACTIVE",
				dashboard?.activeAppointment?.doctorId,
				dashboard?.activeAppointment?.doctorName,
			);
		}
	};

	const handleConfirmCloseShift = () => {
		setIsShiftOpen(false);
		setIsShiftCloseModalOpen(false);
		try {
			safeLocalStorageSetItem("dente_doctor_shift_active", "false");
		} catch (err: unknown) {
			console.warn("[ShiftView] Error saving dente_doctor_shift_active:", err);
		}
		staffTelemetryService.logShiftClose(
			"SHIFT-ACTIVE",
			dashboard?.activeAppointment?.doctorId,
			dashboard?.activeAppointment?.doctorName,
			{
				totalAppointments: shiftStats.totalAppointments,
				completedCount: shiftStats.completedCount,
				totalRevenueRub: shiftStats.totalRevenueRub,
				estimatedDoctorPayoutRub: shiftStats.estimatedDoctorPayoutRub,
			},
		);
	};

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	function runRecommendedAction(action: any) {
		if (
			action?.patientId &&
			action.patientId !== "00000000-0000-0000-0000-000000000000" &&
			patientsById.has(action.patientId)
		) {
			if (setSelectedPatientId) setSelectedPatientId(action.patientId);
		}
		const section =
			typeof action?.section === "string" && action.section
				? action.section
				: "shift";
		window.location.hash = section;
	}

	if (isMobile) {
		return (
			<div
				className="mobile-shift-cockpit-view-wrapper"
				style={{ width: "100%", maxWidth: "100vw", overflowX: "clip" }}
				data-testid="shift-view-mobile"
			>
				<MobileShiftCockpit
					isShiftOpen={isShiftOpen}
					onToggleShift={handleToggleShift}
					shiftNumber={dashboard?.shiftNumber ?? 104}
					doctorName={activeDoctorFullName}
					doctorSpecialty={dashboard?.activeDoctor?.specialty || "Стоматолог-терапевт"}
					cabinetName={
						(inChairAppointment as any)?.cabinetName ||
						(inChairAppointment as any)?.room ||
						"Кабинет №1"
					}
					shiftOpenedAtIso={dashboard?.shiftOpenedAt || `${todayIso}T08:30:00.000Z`}
					totalAppointmentsCount={shiftStats.totalAppointments}
					completedCount={shiftStats.completedCount}
					inChairCount={shiftStats.inProgressCount}
					totalRevenueRub={shiftStats.totalRevenueRub}
					cashInDrawerRub={Math.round(shiftStats.totalRevenueRub * 0.45)}
					cardSumRub={Math.round(shiftStats.totalRevenueRub * 0.35)}
					sbpSumRub={Math.round(shiftStats.totalRevenueRub * 0.2)}
					doctorCommissionPct={shiftStats.doctorCommissionPct}
					estimatedDoctorPayoutRub={shiftStats.estimatedDoctorPayoutRub}
					appointments={mobileAppointments}
					onSelectAppointment={(appId) => {
						if (typeof (props as any).onSelectAppointment === "function") {
							(props as any).onSelectAppointment(appId);
						}
					}}
					onOpenPatientEmk={(patientId) => {
						if (typeof setSelectedPatientId === "function") {
							setSelectedPatientId(patientId);
						}
						window.location.hash = "emk";
					}}
					onOpenCashCheckout={(patientId) => {
						if (typeof setSelectedPatientId === "function") {
							setSelectedPatientId(patientId);
						}
						window.location.hash = "invoices";
					}}
				/>
				{isPayrollModalOpen && (
					<DoctorPayrollModal
						isOpen={isPayrollModalOpen}
						onClose={() => setIsPayrollModalOpen(false)}
						clinicName={dashboard?.clinicName}
						doctorsList={shiftDoctorsList}
						initialDoctorId={shiftActiveDoctorId}
						initialServices={shiftCompletedServices}
						initialPeriodStart={todayIso}
						initialPeriodEnd={todayIso}
						initialBasePercentage={30}
						useClinicalCategoryRates={true}
					/>
				)}
				{isShiftCloseModalOpen && (
					<DoctorShiftCloseModal
						isOpen={isShiftCloseModalOpen}
						onClose={() => setIsShiftCloseModalOpen(false)}
						onConfirmClose={handleConfirmCloseShift}
						doctorFullName={activeDoctorFullName}
						shiftStats={shiftStats}
						clinicName={dashboard?.clinicName ?? ""}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="shift-view-scroll-container min-w-0" data-testid="shift-view-desktop">
			<div className="px-2 pt-2 pb-1 space-y-2">
				<DoctorKickoffWidget
					doctorName={dashboard?.activeDoctor?.fullName}
					appointmentsCount={todayAppointments.length}
					isShiftOpen={isShiftOpen}
					onToggleShift={handleToggleShift}
					onOpenSchedule={() => {
						window.location.hash = "schedule";
					}}
					onOpenCheckout={() => {
						window.location.hash = "invoices";
					}}
				/>
				<DoctorShiftEarningsWidget
					doctorId={dashboard?.activeDoctor?.id || "doc-1"}
					doctorName={dashboard?.activeDoctor?.fullName || "Лечащий врач"}
					shiftDateIso={todayIso}
					compact={true}
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					appointments={todayAppointments as any}
				/>
			</div>

			<DoctorShiftControlBar
				isShiftOpen={isShiftOpen}
				onToggleShift={handleToggleShift}
				onOpenPayrollModal={() => setIsPayrollModalOpen(true)}
				shiftStats={shiftStats}
			/>

			<section className="shift-hero" id="shift">
				<DoctorShiftHeroCard
					currentPatient={currentPatient}
					currentPatientHasCallablePhone={currentPatientHasCallablePhone}
					currentPatientCallablePhone={currentPatientCallablePhone}
					currentAppointmentReason={currentAppointmentReason}
					nextAppointment={nextAppointment}
					nextAppointmentPatient={nextAppointmentPatient}
					todayAppointmentsCount={todayAppointments.length}
					formatClockTime={formatClockTime}
					onOpenVisit={(patientId) => {
						if (setSelectedPatientId) setSelectedPatientId(patientId);
						window.location.hash = "visit";
					}}
					onOpenImaging={(patientId) => {
						if (setSelectedPatientId) setSelectedPatientId(patientId);
						window.location.hash = "imaging";
					}}
					onCallPatientError={(msg) => {
						if (setError) setError(msg);
					}}
					onStartNextAppointment={(patientId) => {
						if (setSelectedPatientId) setSelectedPatientId(patientId);
						window.location.hash = "visit";
					}}
					onOpenSchedule={() => {
						window.location.hash = "schedule";
					}}
				/>

				{/* Субкомпонент: Сводка визитов врача за смену и KPI (StomX оперативная доска) */}
				<DoctorShiftVisitsKpiSection
					todayAppointments={todayAppointments}
					inChairAppointments={inChairAppointments}
					waitingAppointments={waitingAppointments}
					awaitingPaymentAppointments={awaitingPaymentAppointments}
					patientsById={patientsById}
					staffById={staffById}
					currentPatient={currentPatient}
					inChairAppointment={inChairAppointment}
					manyDoctors={manyDoctors}
					onSelectPatient={(patientId) => {
						if (setSelectedPatientId) setSelectedPatientId(patientId);
					}}
					onOpenAppointmentEmk={(patientId) => {
						if (setSelectedPatientId) setSelectedPatientId(patientId);
						window.location.hash = "visit";
					}}
					onOpenCashier={(patientId) => {
						if (setSelectedPatientId) setSelectedPatientId(patientId);
						window.location.hash = "finance";
					}}
					onOpenQueueBoardModal={() => setIsQueueBoardModalOpen(true)}
					onOpenSchedule={() => {
						window.location.hash = "schedule";
					}}
				/>
			</section>

			{/* Субкомпонент 1: Кассовый срез смены и инкассация (Мандат 54-ФЗ) */}
			<div className="my-3">
				<DoctorShiftCashSection
					totalRevenueRub={shiftStats.totalRevenueRub}
					doctorCommissionPct={shiftStats.doctorCommissionPct}
					estimatedDoctorPayoutRub={shiftStats.estimatedDoctorPayoutRub}
					doctorFullName={activeDoctorFullName}
					clinicName={dashboard?.clinicName ?? ""}
					onPrintStatement={() => setIsShiftCloseModalOpen(true)}
				/>
			</div>

			{/* Субкомпонент 2: Чек-лист передачи кабинета и готовности стерилизации (СанПиН 3.3686-21) */}
			<div className="my-3">
				<DoctorCabinetHandoverCard
					cabinetName={(inChairAppointment as any)?.cabinetName || "Кабинет №1"}
					doctorFullName={activeDoctorFullName}
					nextDoctorName="Сменяющий врач"
				/>
			</div>

			<div
				className="shift-dashboard-grid"
				style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}
			>
				<ShiftTodoListSection
					visibleRecommendedActions={visibleRecommendedActions}
					recommendedActionPriorityLabels={recommendedActionPriorityLabels}
					patientsById={patientsById}
					onRunRecommendedAction={runRecommendedAction}
				/>

				<section
					className="shift-emk-control"
					style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "14px", boxShadow: "var(--shadow-1)" }}
				>
					<EmkControlBoard dashboard={dashboard} />
				</section>

				{/* Субкомпонент: Операционный контроль смены (modeFit, загрузка, задачи по ролям) */}
				<ShiftIntelligenceSection
					dashboard={dashboard}
					mostLoadedResource={mostLoadedResource}
					activeQueueRole={activeQueueRole}
					rolesWorthShowing={rolesWorthShowing}
					staffRoleLabels={staffRoleLabels}
				/>
			</div>

			{/* Doctor Piece-Rate Payroll Calculation & Form T-51 Modal */}
			{isPayrollModalOpen && (
				<DoctorPayrollModal
					isOpen={isPayrollModalOpen}
					onClose={() => setIsPayrollModalOpen(false)}
					clinicName={dashboard?.clinicName}
					doctorsList={shiftDoctorsList}
					initialDoctorId={shiftActiveDoctorId}
					initialServices={shiftCompletedServices}
					initialPeriodStart={todayIso}
					initialPeriodEnd={todayIso}
					initialBasePercentage={30}
					useClinicalCategoryRates={true}
				/>
			)}

			{/* Doctor Shift Close Reconciliation & Handover Modal */}
			{isShiftCloseModalOpen && (
				<DoctorShiftCloseModal
					isOpen={isShiftCloseModalOpen}
					onClose={() => setIsShiftCloseModalOpen(false)}
					onConfirmClose={handleConfirmCloseShift}
					doctorFullName={activeDoctorFullName}
					shiftStats={shiftStats}
					clinicName={dashboard?.clinicName ?? ""}
				/>
			)}

			{/* Интерактивная доска очереди StomX и ТВ-табло холла */}
			{isQueueBoardModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
					role="dialog"
					aria-modal="true"
					data-testid="today-queue-board-modal"
				>
					<div className="bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] w-full max-w-5xl max-h-[92vh] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3 overflow-hidden">
						<div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-2.5">
							<h3 className="m-0 font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-2">
								<Monitor size={18} className="text-teal-600" />
								<span>Оперативная доска смены & ТВ-табло холла</span>
							</h3>
							<button
								type="button"
								onClick={() => setIsQueueBoardModalOpen(false)}
								className="w-8 h-8 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
								aria-label="Закрыть доску очереди"
								data-testid="btn-close-queue-board-modal"
							>
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<TodayQueueBoard
								appointments={todayAppointments}
								onStatusChange={(appointmentId, newStatus) => {
									if (typeof (props as any).onUpdateAppointmentStatus === "function") {
										(props as any).onUpdateAppointmentStatus(appointmentId, newStatus);
									}
								}}
								onOpenAppointment={(appId) => {
									setIsQueueBoardModalOpen(false);
									if (typeof (props as any).onSelectAppointment === "function") {
										(props as any).onSelectAppointment(appId);
									}
								}}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

type CockpitPatient = Dashboard["patients"][number];
type CockpitPatientInsight = Dashboard["patientInsights"][number];

export type PatientCockpitProps = {
	activePatient: CockpitPatient | null | undefined;
	activePatientInsight: CockpitPatientInsight | null | undefined;
	dashboard: Dashboard | null | undefined;
	activeCommunicationTasks: readonly unknown[];
	activeImagingStudies: readonly unknown[];
	activeUsableDocuments: readonly unknown[];
};

export function PatientCockpit({
	activePatient,
	activePatientInsight,
	dashboard,
	activeCommunicationTasks,
	activeImagingStudies,
	activeUsableDocuments,
}: PatientCockpitProps) {
	if (!activePatient) {
		return (
			<section
				className="patient-cockpit dnt-cockpit"
				aria-label="Карточка пациента"
			>
				<div className="patient-summary-card">
					<p className="eyebrow" style={{ margin: "0 0 8px" }}>
						Карточка пациента
					</p>
					<h2>Пациент не выбран</h2>
					<div
						className="patient-facts"
						style={{
							marginTop: "8px",
							fontSize: "13px",
							color: "var(--muted)",
						}}
					>
						<span>
							Выберите пациента в списке или расписании, чтобы увидеть его
							данные.
						</span>
					</div>
					<div
						style={{
							display: "flex",
							gap: "8px",
							flexWrap: "wrap",
							marginTop: "10px",
						}}
					>
						<a className="secondary-button min-h-[44px] px-3 py-2 flex items-center justify-center" href="#patients">
							Выбрать пациента
						</a>
						<a className="text-button min-h-[44px] px-3 py-2 flex items-center justify-center" href="#schedule">
							Открыть записи
						</a>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			className="patient-cockpit dnt-cockpit"
			aria-label="Карточка пациента"
		>
			<div className="patient-summary-card col-gap-16">
				<p
					className="eyebrow"
					style={{
						margin: 0,
						fontSize: "11px",
						fontWeight: 700,
						letterSpacing: "0.09em",
						textTransform: "uppercase",
						color: "var(--muted)",
					}}
				>
					Карточка пациента
				</p>
				<div className="patient-hero min-w-0">
					<PatientAvatar fullName={activePatient.fullName} size={44} />
					<div className="hero-info min-w-0">
						<h2 style={{ fontSize: "16px", wordBreak: "break-word", lineHeight: 1.25 }}>{activePatient.fullName}</h2>
						<p
							style={{
								margin: "1px 0 0",
								fontSize: "12px",
								color: "var(--muted)",
								wordBreak: "break-word",
							}}
						>
							{activePatient.id
								? `карта № ${activePatient.id.slice(0, 6)}`
								: "номер карты не присвоен"}
						</p>
					</div>
				</div>

				<div
					className="patient-info-list"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "9px",
						fontSize: "13px",
						color: "var(--ink-2)",
						minWidth: 0,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
						<Calendar
							size={14}
							style={{ color: "var(--muted)", flexShrink: 0 }}
						/>
						<span className="min-w-0 break-words">
							Дата рождения:{" "}
							<strong style={{ color: "var(--ink)", fontWeight: 600 }}>
								{birthDateLabel(activePatient.birthDate)}
							</strong>
						</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
						<Phone size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
						<span className="min-w-0 break-words">
							Телефон:{" "}
							<strong
								style={{
									color: "var(--ink)",
									fontWeight: 600,
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{activePatient.phone ?? "не указан"}
							</strong>
						</span>
					</div>
					{activePatient.notes && (
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "8px",
								minWidth: 0,
							}}
						>
							<Info
								size={14}
								style={{
									color: "var(--muted)",
									flexShrink: 0,
									marginTop: "2px",
								}}
							/>
							<span className="min-w-0 break-words leading-tight">
								Заметки:{" "}
								<strong style={{ color: "var(--ink)", fontWeight: 600 }}>
									{activePatient.notes}
								</strong>
							</span>
						</div>
					)}
				</div>

				{activePatientInsight ? (
					<div
						className={`patient-insight-panel risk-${activePatientInsight.riskLevel}`}
						style={{
							padding: "12px 14px",
							borderRadius: "11px",
							background:
								activePatientInsight.riskLevel === "high"
									? "var(--bad-bg)"
									: activePatientInsight.riskLevel === "watch"
										? "var(--warn-bg)"
										: "var(--paper-soft)",
							border:
								"1px solid " +
								(activePatientInsight.riskLevel === "high"
									? "var(--bad-fg)"
									: activePatientInsight.riskLevel === "watch"
										? "var(--warn-fg)"
										: "var(--line)"),
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "7px",
							}}
						>
							<span
								style={{
									fontSize: "10.5px",
									fontWeight: 800,
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									color:
										activePatientInsight.riskLevel === "high"
											? "var(--bad-fg)"
											: activePatientInsight.riskLevel === "watch"
												? "var(--warn-fg)"
												: "var(--muted)",
									flexShrink: 0,
								}}
							>
								{patientInsightRiskLabels[activePatientInsight.riskLevel]}
							</span>
							<strong style={{ fontSize: "12.5px", color: "var(--ink)", wordBreak: "break-word", lineHeight: 1.3 }}>
								{activePatientInsight.nextBestAction}
							</strong>
						</div>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								fontSize: "11.5px",
								fontWeight: 600,
							}}
						>
							{activePatientInsight.balanceDueRub ? (
								<span
									style={{
										background: "var(--paper)",
										padding: "3px 8px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
									}}
								>
									<CreditCard size={13} className="inline mr-1 text-amber-500" /> Долг {money(activePatientInsight.balanceDueRub)}
								</span>
							) : null}
							{activePatientInsight.openTasks > 0 ? (
								<span
									style={{
										background: "var(--paper)",
										padding: "3px 8px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
									}}
								>
									<Phone size={13} className="inline mr-1 text-[var(--teal)]" />{" "}
									{countLabel(
										activePatientInsight.openTasks,
										"задача",
										"задачи",
										"задач",
									)}{" "}
									на связь
								</span>
							) : null}
							{(activePatientInsight.missingDocumentKinds?.length ?? 0) > 0 ? (
								<span
									style={{
										background: "var(--paper)",
										padding: "3px 8px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
									}}
								>
									<FileText size={13} className="inline mr-1 text-rose-500" /> не хватает{" "}
									{countLabel(
										activePatientInsight.missingDocumentKinds?.length ?? 0,
										"документа",
										"документов",
										"документов",
									)}
								</span>
							) : null}
							{activePatientInsight.recallDueAt ? (
								<span
									style={{
										background: "var(--paper)",
										padding: "3px 8px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
									}}
								>
									повторный визит{" "}
									{formatShortDate(activePatientInsight.recallDueAt)}
								</span>
							) : null}
						</div>
					</div>
				) : null}
			</div>

			<PatientCockpitFeatureGrid
				activeUsableDocuments={activeUsableDocuments}
				dashboard={dashboard}
				activeCommunicationTasks={activeCommunicationTasks}
				activeImagingStudies={activeImagingStudies}
			/>
		</section>
	);
}
