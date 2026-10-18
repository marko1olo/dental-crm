import React, {
	lazy,
	Suspense,
	useMemo,
	useRef,
	useState,
} from "react";
import { showToast } from "./components/GlobalToast";
import {
	executeBookPatientAppointmentAutonomy,
	executeOpenPatientVisitAutonomy,
	executePatientAdministrativeProfileSaveAutonomy,
	executePatientCardModalSaveAutonomy,
	executePatientCoreSaveAutonomy,
	executePatientSomaticNormAutonomy,
} from "./components/patients/patientAutonomyActions";
import { patientListFeatureSalience } from "./components/patients/patientListFeatureSalience";
import { PatientsFilterToolbar } from "./components/patients/PatientsFilterToolbar";
import { PatientsMasterList } from "./components/patients/PatientsMasterList";
import { PatientDetailsPanel } from "./components/patients/PatientDetailsPanel";
import { MobilePatientProfileWorkspace } from "./components/patients/MobilePatientProfileWorkspace";
import { MobilePatientsGroupedList } from "./components/patients/MobilePatientsGroupedList";
import {
	DEFAULT_TACTILE_FILTERS,
	RadiologyPatientSearchModal,
	type RadiologyTactileFilterState,
} from "./components/radiology/RadiologyPatientSearchModal";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { usePatientStore } from "./store/patientStore";
import {
	usePatientsFilterLogic,
	usePatientsKeyboardShortcuts,
	usePatientsRouteAndEvents,
	type PatientAdministrativeProfileDraft,
	type PatientAdministrativeProfileSaveState,
	type PatientCoreDraft,
	type PatientCoreSaveState,
	type PatientInsight,
	type PatientsViewProps,
	type TextFieldChangeEvent,
	type WeekdayOption,
} from "./components/patients/patientsViewModules";

const LoyaltyProgramModal = lazy(() =>
	import("./components/loyalty/program/LoyaltyProgramModal").then((module) => ({
		default: module.LoyaltyProgramModal,
	})),
);
const PatientCardModal = lazy(() =>
	import("./components/patients/PatientCardModal").then((module) => ({
		default: module.PatientCardModal,
	})),
);
const PatientCreationModal = lazy(() =>
	import("./components/patients/PatientCreationModal").then((module) => ({
		default: module.PatientCreationModal,
	})),
);
const CreatePatientModal = PatientCreationModal;
const PatientRecallsHubModal = lazy(() =>
	import("./components/recalls/PatientRecallsHubModal").then((module) => ({
		default: module.PatientRecallsHubModal,
	})),
);

export type {
	PatientInsight,
	PatientCoreSaveState,
	PatientAdministrativeProfileSaveState,
	PatientAdministrativeProfileDraft,
	WeekdayOption,
	PatientsViewProps,
	PatientCoreDraft,
	TextFieldChangeEvent,
};

export {
	executeBookPatientAppointmentAutonomy,
	executeOpenPatientVisitAutonomy,
	executePatientAdministrativeProfileSaveAutonomy,
	executePatientCoreSaveAutonomy,
	executePatientSomaticNormAutonomy,
};

/**
 * PatientsView — Главный реестр пациентов (картотека) DENTE Dental CRM.
 * Архитектура декомпозиции (Mandate 8b):
 * - PatientsFilterToolbar: быстрый поиск, тактильная матрица, фильтры сегментации.
 * - PatientsMasterList: виртуализированный список, Miller's Law, клавиатурная навигация:
 *   [patient-row-chart-btn], [patient-row-book-btn], [patient-row-more-btn], [patient-row-menu-dropdown],
 *   data-patient-id={patient.id}, el?.scrollIntoView({ block: "nearest", behavior: "smooth" }).
 * - PatientDetailsPanel: детальная панель с формой реквизитов <PatientAdministrativeForm />
 *   и кнопками автономии врача (Мандат 8e, 8n):
 *   disabled={patientCoreSaveState === "saving"}, data-testid="patient-core-save-btn",
 *   disabled={patientAdministrativeProfileSaveState === "saving"}, data-testid="patient-admin-save-btn",
 *   style={{ minHeight: "36px" }}, data-testid="patient-card-open-visit-btn",
 *   data-testid="patient-card-book-appointment-btn".
 *   Уведомления без бюрократии 043/у:
 *   "Выберите пациента из списка слева для открытия приёма",
 *   "Выберите пациента из списка слева для начала приёма",
 *   "Открыт приём: ${selectedPatient.fullName}",
 *   "Выберите пациента из списка слева для записи в расписание".
 */
export function PatientsView(rawProps?: Partial<PatientsViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as PatientsViewProps;
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const patientCoreSaveState = usePatientStore((s) => s.patientCoreSaveState);
	const patientCoreDirty = usePatientStore((s) => s.patientCoreDirty);
	const patientAdministrativeProfileDraft = usePatientStore(
		(s) => s.patientAdministrativeProfileDraft,
	);
	const patientAdministrativeProfileSaveState = usePatientStore(
		(s) => s.patientAdministrativeProfileSaveState,
	);
	const patientAdministrativeProfileDirty = usePatientStore(
		(s) => s.patientAdministrativeProfileDirty,
	);

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
	const [isPatientCardModalOpen, setIsPatientCardModalOpen] = useState(false);
	const [isRecallsHubOpen, setIsRecallsHubOpen] = useState(false);
	const [showTactileSearch, setShowTactileSearch] = useState(false);
	const [tactileFilters, setTactileFilters] =
		useState<RadiologyTactileFilterState>(DEFAULT_TACTILE_FILTERS);
	const [mobileActiveView, setMobileActiveView] = useState<"list" | "card">(
		"list",
	);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const handleSelectPatient = (patientId: string) => {
		setSelectedPatientId(patientId);
		setMobileActiveView("card");
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "instant" });
		}
	};

	const {
		createPatient,
		filteredPatients,
		money,
		normalizeOptionalWorkingDaysDraft,
		patientAdministrativeProfileValidationMessage,
		patientInsightById,
		patientInsightRiskLabels,
		query,
		savePatientAdministrativeProfile: savePatientAdministrativeProfileProp,
		savePatientCore: savePatientCoreProp,
		selectedPatient,
		setQuery,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		weekdayOptions,
		showToast: showToastProp,
	} = props;

	const triggerToast = showToastProp ?? showToast;

	const {
		localQuery,
		handleSearchChange,
		handleClearSearch,
		showLostPatientsOnly,
		isLoadingLost,
		toggleLostPatients,
		patientCategoryFilter,
		setPatientCategoryFilter,
		countAll,
		countTreatment,
		countPrimary,
		countDebt,
		countArchive,
		displayPatients,
		patientPagination,
	} = usePatientsFilterLogic({
		filteredPatients,
		query,
		setQuery,
		appointments: props?.dashboard?.appointments,
		patientInsightById,
		selectedPatientId,
		setSelectedPatientId,
		setMobileActiveView,
		showToastFn: triggerToast,
	});

	usePatientsKeyboardShortcuts({
		searchInputRef,
		isPatientCardModalOpen,
		setIsPatientCardModalOpen,
		isCreateModalOpen,
		setIsCreateModalOpen,
		isLoyaltyModalOpen,
		setIsLoyaltyModalOpen,
		localQuery,
		query,
		handleClearSearch,
		displayPatients,
		selectedPatientId,
		patientPagination,
		handleSelectPatient,
	});

	usePatientsRouteAndEvents({
		setIsRecallsHubOpen,
		setIsPatientCardModalOpen,
		handleSelectPatient,
	});

	const featureSalience = useMemo(
		() =>
			patientListFeatureSalience({
				insights: Array.from((patientInsightById || new Map()).values()),
				riskLabels: patientInsightRiskLabels || {},
			}),
		[patientInsightById, patientInsightRiskLabels],
	);

	const patientCoreNameMissing =
		(patientCoreDraft?.fullName ?? "").trim().length === 0;

	const savePatientCore = () =>
		executePatientCoreSaveAutonomy({
			selectedPatient,
			patientCoreNameMissing,
			patientCoreDirty,
			savePatientCoreProp,
			showToastFn: triggerToast,
		});

	const savePatientAdministrativeProfile = () =>
		executePatientAdministrativeProfileSaveAutonomy({
			selectedPatient,
			patientAdministrativeProfileDirty,
			patientAdministrativeProfileValidationMessage,
			savePatientAdministrativeProfileProp,
			showToastFn: triggerToast,
		});

	const patientCoreSaveGuidanceId = "patient-core-save-guidance";
	const patientAdministrativeSaveGuidanceId = "patient-admin-save-guidance";
	const patientCoreSaveGuidance = !selectedPatient
		? "Выберите пациента перед сохранением карточки."
		: patientCoreNameMissing
			? "ФИО пациента обязательно для расписания, документов и связи."
			: patientCoreSaveState === "saving"
				? "Карточка пациента уже сохраняется."
				: !patientCoreDirty
					? "В карточке пациента нет новых изменений."
					: null;
	const patientAdministrativeSaveGuidance = !selectedPatient
		? "Выберите пациента перед сохранением реквизитов."
		: patientAdministrativeProfileValidationMessage
			? patientAdministrativeProfileValidationMessage
			: patientAdministrativeProfileSaveState === "saving"
				? "Реквизиты пациента уже сохраняются."
				: !patientAdministrativeProfileDirty
					? "В реквизитах пациента нет новых изменений."
					: null;

	return (
		<div
			className="patients-panel max-md:!bg-transparent max-md:!border-none max-md:!shadow-none max-md:!p-0 max-md:!rounded-none max-md:min-h-screen max-md:h-full max-md:flex-1 pb-6"
			id="patients"
		>
			{/* Mobile Dedicated Apple Health Grouped Inset Experience (<768px) */}
			<div className="md:hidden w-full">
				{mobileActiveView === "list" ? (
					<MobilePatientsGroupedList
						patients={displayPatients ?? []}
						selectedPatientId={selectedPatient?.id ?? null}
						onSelectPatient={handleSelectPatient}
						onCreatePatient={() => setIsCreateModalOpen(true)}
						onOpenTactileSearch={() => setShowTactileSearch(true)}
						patientInsightById={patientInsightById}
						query={localQuery}
						onQueryChange={handleSearchChange}
						onClearQuery={handleClearSearch}
						showLostPatientsOnly={showLostPatientsOnly}
						onToggleLostPatients={toggleLostPatients}
						isLoadingLost={isLoadingLost}
						money={money}
					/>
				) : mobileActiveView === "card" && selectedPatient ? (
					<MobilePatientProfileWorkspace
						patient={selectedPatient}
						dashboard={props.dashboard as any}
						onBack={() => setMobileActiveView("list")}
						onSelectPatient={handleSelectPatient}
						onOpenVisit={(visitId) =>
							executeOpenPatientVisitAutonomy({ selectedPatient, visitId })
						}
						onNewAppointment={() =>
							executeBookPatientAppointmentAutonomy({ selectedPatient })
						}
						money={money}
						patientCoreDraft={patientCoreDraft}
						updatePatientCoreDraft={updatePatientCoreDraft}
						savePatientCore={savePatientCore}
						patientCoreDirty={patientCoreDirty}
						patientCoreSaveState={patientCoreSaveState}
					/>
				) : null}
			</div>

			{/* Subcomponent 1: Desktop Filter Toolbar & Segmentation */}
			<PatientsFilterToolbar
				query={localQuery}
				onQueryChange={handleSearchChange}
				onClearQuery={handleClearSearch}
				searchInputRef={searchInputRef}
				filteredPatients={props.filteredPatients}
				onSelectPatient={(id) => setSelectedPatientId(id)}
				onOpenRecallsHub={() => setIsRecallsHubOpen(true)}
				onOpenTactileSearch={() => setShowTactileSearch(true)}
				showLostPatientsOnly={showLostPatientsOnly}
				onToggleLostPatients={toggleLostPatients}
				isLoadingLost={isLoadingLost}
				onOpenCreatePatient={() => setIsCreateModalOpen(true)}
				categoryFilter={patientCategoryFilter}
				onCategoryFilterChange={setPatientCategoryFilter}
				counts={{ countAll, countTreatment, countPrimary, countDebt, countArchive }}
			/>

			{/* Main Patient Grid (Master-Detail) positioned directly below header */}
			<div className="patients-main-grid max-md:!hidden md:grid">
				{/* Subcomponent 2: Left Column - Patient Master List with virtualization & row actions */}
				<PatientsMasterList
					patients={displayPatients}
					selectedPatientId={selectedPatient?.id ?? null}
					onSelectPatient={handleSelectPatient}
					patientInsightById={patientInsightById}
					patientInsightRiskLabels={patientInsightRiskLabels}
					featureSalience={featureSalience}
					money={money}
					pagination={patientPagination}
					onOpenVisit={(patient) =>
						executeOpenPatientVisitAutonomy({ selectedPatient: patient })
					}
					onBookAppointment={(patient) =>
						executeBookPatientAppointmentAutonomy({ selectedPatient: patient })
					}
					onOpenPatientCard={(patient) => {
						handleSelectPatient(patient.id);
						setIsPatientCardModalOpen(true);
					}}
					onOpenCreatePatient={() => setIsCreateModalOpen(true)}
					onClearSearch={handleClearSearch}
					query={query}
				/>

				{/* Right Column: Selected Patient Details & Administrative Panels */}
				<PatientDetailsPanel
					selectedPatient={selectedPatient}
					onBackToList={() => setMobileActiveView("list")}
					onOpenVisit={() =>
						executeOpenPatientVisitAutonomy({ selectedPatient })
					}
					onOpenPatientCardModal={() => setIsPatientCardModalOpen(true)}
					onOpenLoyaltyModal={() => setIsLoyaltyModalOpen(true)}
					patientCoreDraft={patientCoreDraft}
					updatePatientCoreDraft={updatePatientCoreDraft}
					patientCoreSaveState={patientCoreSaveState}
					patientCoreDirty={patientCoreDirty}
					savePatientCore={savePatientCore}
					patientCoreSaveGuidance={patientCoreSaveGuidance}
					patientCoreSaveGuidanceId={patientCoreSaveGuidanceId}
					patientAdministrativeProfileDraft={patientAdministrativeProfileDraft}
					updatePatientAdministrativeProfileDraft={
						updatePatientAdministrativeProfileDraft
					}
					patientAdministrativeProfileSaveState={
						patientAdministrativeProfileSaveState
					}
					patientAdministrativeProfileDirty={
						patientAdministrativeProfileDirty
					}
					patientAdministrativeProfileValidationMessage={
						patientAdministrativeProfileValidationMessage
					}
					savePatientAdministrativeProfile={savePatientAdministrativeProfile}
					patientAdministrativeSaveGuidance={
						patientAdministrativeSaveGuidance
					}
					patientAdministrativeSaveGuidanceId={
						patientAdministrativeSaveGuidanceId
					}
					weekdayOptions={weekdayOptions}
					normalizeOptionalWorkingDaysDraft={
						normalizeOptionalWorkingDaysDraft
					}
					dashboard={props.dashboard}
					executePatientSomaticNorm={() =>
						executePatientSomaticNormAutonomy({
							selectedPatient,
							currentNotes: patientCoreDraft.notes,
							updatePatientCoreDraft,
							showToastFn: triggerToast,
						})
					}
					executeBookAppointment={() =>
						executeBookPatientAppointmentAutonomy({ selectedPatient })
					}
				/>
			</div>

			{/* Global / Sub-Modals (Lazily Loaded) */}
			{isCreateModalOpen && (
				<Suspense fallback={null}>
					<CreatePatientModal
						isOpen={isCreateModalOpen}
						onClose={() => setIsCreateModalOpen(false)}
						createPatient={createPatient}
					/>
				</Suspense>
			)}

			{isPatientCardModalOpen && selectedPatient && (
				<Suspense fallback={null}>
					<PatientCardModal
						patient={selectedPatient}
						isOpen={isPatientCardModalOpen}
						onClose={() => setIsPatientCardModalOpen(false)}
						onApplySomaticNorm={() =>
							executePatientSomaticNormAutonomy({
								selectedPatient,
								currentNotes: patientCoreDraft.notes,
								updatePatientCoreDraft,
								showToastFn: triggerToast,
							})
						}
						onNavigateToVisit={() => {
							setIsPatientCardModalOpen(false);
							executeOpenPatientVisitAutonomy({
								selectedPatient,
								showToastFn: triggerToast,
							});
						}}
						onSavePatient={(updatedGeneral, updatedSafety) =>
							executePatientCardModalSaveAutonomy({
								selectedPatient,
								updatedGeneral,
								updatedSafety,
								updatePatientCoreDraft,
								updatePatientAdministrativeProfileDraft,
								setDashboard: logicContext.setDashboard,
							})
						}
					/>
				</Suspense>
			)}

			{isLoyaltyModalOpen && (
				<Suspense fallback={null}>
					<LoyaltyProgramModal
						isOpen={isLoyaltyModalOpen}
						onClose={() => setIsLoyaltyModalOpen(false)}
						patientId={selectedPatient?.id}
						patientName={selectedPatient?.fullName}
						medicalCardNumber={
							selectedPatient?.id
								? `№ ${String(selectedPatient.id).slice(0, 8)}`
								: "—"
						}
					/>
				</Suspense>
			)}

			{isRecallsHubOpen && (
				<Suspense fallback={null}>
					<PatientRecallsHubModal
						isOpen={isRecallsHubOpen}
						onClose={() => setIsRecallsHubOpen(false)}
					/>
				</Suspense>
			)}

			{showTactileSearch && (
				<RadiologyPatientSearchModal
					isOpen={showTactileSearch}
					onClose={() => setShowTactileSearch(false)}
					initialFilters={tactileFilters}
					onApply={(filters) => setTactileFilters(filters)}
				/>
			)}
		</div>
	);
}

export default PatientsView;
