import type {
	Dashboard,
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import React, {
	lazy,
	startTransition,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { showToast } from "./components/GlobalToast";
import { PatientCardSavePill } from "./components/patients/patientCardSavePill";
import {
	PatientAdministrativeForm,
} from "./components/patients/PatientAdministrativeForm";
import {
	PatientCoreEditorForm,
	type PatientCoreDraft,
	type TextFieldChangeEvent,
} from "./components/patients/PatientCoreEditorForm";
import { PatientDetailsPanel } from "./components/patients/PatientDetailsPanel";
import { PatientFamilyAndInsuranceWidget } from "./components/patients/PatientFamilyAndInsuranceWidget";
import {
	executeBookPatientAppointmentAutonomy,
	executeOpenPatientVisitAutonomy,
	executePatientAdministrativeProfileSaveAutonomy,
	executePatientCoreSaveAutonomy,
	executePatientSomaticNormAutonomy,
} from "./components/patients/patientAutonomyActions";
import { patientListFeatureSalience } from "./components/patients/patientListFeatureSalience";
import { PatientsFilterToolbar } from "./components/patients/PatientsFilterToolbar";
import { PatientsMasterList } from "./components/patients/PatientsMasterList";
import { MobilePatientProfileWorkspace } from "./components/patients/MobilePatientProfileWorkspace";
import { MobilePatientsGroupedList } from "./components/patients/MobilePatientsGroupedList";
import {
	DEFAULT_TACTILE_FILTERS,
	RadiologyPatientSearchModal,
	type RadiologyTactileFilterState,
} from "./components/radiology/RadiologyPatientSearchModal";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useDomListPagination } from "./hooks/useMemoryLeakGuard";
import { actionFailureToast } from "./lib/panelStateText";
import { usePatientStore } from "./store/patientStore";
import { getOptimizedTiming } from "./utils/lowSpecHddOptimizer";

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

type PatientInsight = Dashboard["patientInsights"][number];
export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";
export type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export type { PatientCoreDraft, TextFieldChangeEvent };

export type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		| "preferredAppointmentWeekdays"
		| "isAnonymous"
		| "anonymousCode"
		| "decree659Compliance"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
	isAnonymous?: boolean | null;
	anonymousCode?: string | null;
	decree659Compliance?: Record<string, unknown> | null;
};

export type WeekdayOption = {
	label: string;
	value: number;
};

export type PatientsViewProps = {
	createPatient: () => void | Promise<void>;
	filteredPatients: Patient[];
	money: (amountRub: number) => string;
	normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
	patientAdministrativeProfileValidationMessage: string | null;
	patientInsightById: Map<string, PatientInsight>;
	patientInsightRiskLabels: Record<PatientInsight["riskLevel"], string>;
	query: string;
	savePatientAdministrativeProfile: () =>
		| undefined
		| Promise<undefined | boolean>;
	savePatientCore: () => undefined | Promise<undefined | boolean>;
	selectedPatient: Patient | null | undefined;
	setQuery: (value: string) => void;
	updatePatientAdministrativeProfileDraft: (
		field: keyof PatientAdministrativeProfileDraft,
		value: string | number[],
	) => void;
	updatePatientCoreDraft: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	weekdayOptions: WeekdayOption[];
	dashboard?: Dashboard | null;
	showToast?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
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
 *   и кнопками автономии врача:
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

	const [localQuery, setLocalQuery] = useState(query);
	const searchDebounceTimerRef = useRef<number | null>(null);

	useEffect(() => {
		setLocalQuery(query);
	}, [query]);

	const handleSearchChange = useCallback(
		(val: string) => {
			setLocalQuery(val);
			setMobileActiveView("list");
			if (searchDebounceTimerRef.current !== null) {
				window.clearTimeout(searchDebounceTimerRef.current);
			}
			const debounceMs = getOptimizedTiming().searchDebounceMs;
			searchDebounceTimerRef.current = window.setTimeout(() => {
				searchDebounceTimerRef.current = null;
				startTransition(() => {
					setQuery(val);
				});
			}, debounceMs);
		},
		[setQuery],
	);

	const handleClearSearch = useCallback(() => {
		if (searchDebounceTimerRef.current !== null) {
			window.clearTimeout(searchDebounceTimerRef.current);
			searchDebounceTimerRef.current = null;
		}
		setLocalQuery("");
		setMobileActiveView("list");
		startTransition(() => {
			setQuery("");
		});
	}, [setQuery]);

	const [showLostPatientsOnly, setShowLostPatientsOnly] = useState(false);
	const [lostPatientIds, setLostPatientIds] = useState<Set<string> | null>(
		null,
	);
	const [isLoadingLost, setIsLoadingLost] = useState(false);

	const toggleLostPatients = () => {
		if (showLostPatientsOnly) {
			setShowLostPatientsOnly(false);
			return;
		}
		setIsLoadingLost(true);
		fetch("/api/analytics/lost-patients-filters")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data: Array<{ id: string }>) => {
				const ids = new Set((data || []).map((item) => item.id));
				setLostPatientIds(ids);
				setShowLostPatientsOnly(true);
			})
			.catch((err) => {
				showToast(
					actionFailureToast(
						"Не удалось загрузить фильтры потерянных пациентов",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				setLostPatientIds(new Set());
				setShowLostPatientsOnly(true);
			})
			.finally(() => {
				setIsLoadingLost(false);
			});
	};

	const [patientCategoryFilter, setPatientCategoryFilter] = useState<
		"all" | "primary" | "debt" | "archive"
	>("all");

	const patientApptCountMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const a of props?.dashboard?.appointments || []) {
			if (a.patientId) {
				map.set(a.patientId, (map.get(a.patientId) || 0) + 1);
			}
		}
		return map;
	}, [props?.dashboard?.appointments]);

	const { countAll, countPrimary, countDebt, countArchive } = useMemo(() => {
		let all = 0;
		let primary = 0;
		let debt = 0;
		let archive = 0;
		for (const p of filteredPatients ?? []) {
			if (p.status === "archived") {
				archive += 1;
			} else {
				all += 1;
				const appts = patientApptCountMap.get(p.id) || 0;
				if (appts <= 1) {
					primary += 1;
				}
				const insight = patientInsightById?.get(p.id);
				const hasDebt =
					(insight?.balanceDueRub ?? 0) > 0 ||
					(p.balanceRub !== undefined && p.balanceRub < 0);
				if (hasDebt) {
					debt += 1;
				}
			}
		}
		return {
			countAll: all,
			countPrimary: primary,
			countDebt: debt,
			countArchive: archive,
		};
	}, [filteredPatients, patientApptCountMap, patientInsightById]);

	const displayPatients = useMemo(() => {
		let list = filteredPatients ?? [];
		if (showLostPatientsOnly && lostPatientIds) {
			list = list.filter((p) => lostPatientIds.has(p.id));
		}
		if (patientCategoryFilter === "primary") {
			list = list.filter((p) => {
				if (p.status === "archived") return false;
				const appts = patientApptCountMap.get(p.id) || 0;
				return appts <= 1;
			});
		} else if (patientCategoryFilter === "debt") {
			list = list.filter((p) => {
				const insight = patientInsightById?.get(p.id);
				const hasDebt =
					(insight?.balanceDueRub ?? 0) > 0 ||
					(p.balanceRub !== undefined && p.balanceRub < 0);
				return hasDebt;
			});
		} else if (patientCategoryFilter === "archive") {
			list = list.filter((p) => p.status === "archived");
		} else if (patientCategoryFilter === "all") {
			if (!localQuery.trim() && !query.trim()) {
				list = list.filter((p) => p.status !== "archived");
			}
		}
		return list;
	}, [
		filteredPatients,
		showLostPatientsOnly,
		lostPatientIds,
		patientCategoryFilter,
		patientApptCountMap,
		patientInsightById,
		localQuery,
		query,
	]);

	const patientPagination = useDomListPagination(displayPatients, {
		initialLimit: 40,
		step: 40,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset limit on filter change
	useEffect(() => {
		patientPagination.resetLimit();
	}, [query, showLostPatientsOnly, patientCategoryFilter]);

	useEffect(() => {
		const firstPatient = (displayPatients ?? [])[0];
		if (!selectedPatientId && firstPatient?.id) {
			setSelectedPatientId(firstPatient.id);
		}
	}, [selectedPatientId, displayPatients, setSelectedPatientId]);

	// Global shortcut: Ctrl+K / ⌘K or / focuses search box, Arrow keys navigate
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (
				((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") ||
				(e.key === "/" &&
					document.activeElement?.tagName !== "INPUT" &&
					document.activeElement?.tagName !== "TEXTAREA")
			) {
				e.preventDefault();
				searchInputRef.current?.focus();
				return;
			}
			if (e.key === "Escape") {
				if (isPatientCardModalOpen) {
					setIsPatientCardModalOpen(false);
					return;
				}
				if (isCreateModalOpen) {
					setIsCreateModalOpen(false);
					return;
				}
				if (isLoyaltyModalOpen) {
					setIsLoyaltyModalOpen(false);
					return;
				}
				if (document.activeElement === searchInputRef.current) {
					if (localQuery || query) {
						handleClearSearch();
					} else {
						searchInputRef.current?.blur();
					}
					return;
				}
			}
			const targetTag = (document.activeElement?.tagName || "").toLowerCase();
			const isOtherInput =
				(targetTag === "input" &&
					document.activeElement !== searchInputRef.current) ||
				targetTag === "textarea" ||
				targetTag === "select";
			if (!isOtherInput && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
				if (!displayPatients || displayPatients.length === 0) return;
				e.preventDefault();
				const currentIndex = displayPatients.findIndex(
					(p) => p.id === selectedPatientId,
				);
				let nextIndex = 0;
				if (e.key === "ArrowDown") {
					nextIndex =
						currentIndex < 0
							? 0
							: Math.min(currentIndex + 1, displayPatients.length - 1);
				} else {
					nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
				}
				const nextPatient = displayPatients[nextIndex];
				if (nextPatient) {
					if (nextIndex >= patientPagination.limit) {
						patientPagination.loadMore(
							Math.max(50, nextIndex - patientPagination.limit + 10),
						);
					}
					handleSelectPatient(nextPatient.id);
					const el = document.querySelector(
						`[data-patient-id="${nextPatient.id}"]`,
					);
					el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
				}
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [
		isPatientCardModalOpen,
		isCreateModalOpen,
		isLoyaltyModalOpen,
		query,
		localQuery,
		handleClearSearch,
		displayPatients,
		selectedPatientId,
		patientPagination.limit,
		patientPagination.loadMore,
	]);

	useEffect(() => {
		const handleOpenCard = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.patientId) {
				handleSelectPatient(detail.patientId);
			}
			setIsPatientCardModalOpen(true);
		};
		const handleBackofficeModal = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.modalId === "patient_card") {
				if (detail?.patientId) {
					handleSelectPatient(detail.patientId);
				}
				setIsPatientCardModalOpen(true);
			}
		};
		window.addEventListener("dente-open-patient-card-modal", handleOpenCard);
		window.addEventListener(
			"dente-open-backoffice-modal",
			handleBackofficeModal,
		);
		return () => {
			window.removeEventListener(
				"dente-open-patient-card-modal",
				handleOpenCard,
			);
			window.removeEventListener(
				"dente-open-backoffice-modal",
				handleBackofficeModal,
			);
		};
	}, []);

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
				counts={{ countAll, countPrimary, countDebt, countArchive }}
			/>

			{/* Main Patient Grid (Master-Detail) positioned directly below header */}
			<div className="patients-main-grid max-md:!hidden md:flex">
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
						createPatient={async () => {
							await createPatient();
							setIsCreateModalOpen(false);
						}}
					/>
				</Suspense>
			)}

			{isPatientCardModalOpen && selectedPatient && (
				<Suspense fallback={null}>
					<PatientCardModal
						patient={selectedPatient}
						isOpen={isPatientCardModalOpen}
						onClose={() => setIsPatientCardModalOpen(false)}
					/>
				</Suspense>
			)}

			{isLoyaltyModalOpen && (
				<Suspense fallback={null}>
					<LoyaltyProgramModal
						isOpen={isLoyaltyModalOpen}
						onClose={() => setIsLoyaltyModalOpen(false)}
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

			{false && (
				<>
					<PatientCardSavePill
						hasSelectedPatient={Boolean(selectedPatient)}
						sections={[]}
					/>
					<PatientCardSavePill
						hasSelectedPatient={Boolean(selectedPatient)}
						sections={[]}
					/>
				</>
			)}
		</div>
	);
}
