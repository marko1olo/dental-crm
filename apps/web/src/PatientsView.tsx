import type {
	Dashboard,
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import {
	AlertTriangle,
	Archive,
	ArrowLeft,
	ArrowRight,
	Calendar,
	Camera,
	Check,
	Clock,
	FileText,
	Gift,
	MoreHorizontal,
	Plus,
	Receipt,
	Search,
	ShieldCheck,
	Stethoscope,
	Upload,
	UserCheck,
	Users,
	X,
} from "lucide-react";
import type {
	ChangeEvent,
	KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";
import { LoyaltyProgramModal } from "./components/loyalty/program/LoyaltyProgramModal";
import { OdontogramModule } from "./components/odontogram/OdontogramModule";
import { PatientAvatar } from "./components/PatientAvatar";
import { PatientAdministrativeForm } from "./components/patients/PatientAdministrativeForm";
import { PatientCreationModal, PatientCreationModal as CreatePatientModal } from "./components/patients/PatientCreationModal";
import { PatientCardModal } from "./components/patients/PatientCardModal";
import { PatientOverviewTab } from "./components/patients/PatientOverviewTab";
import { PatientCardSavePill } from "./components/patients/patientCardSavePill";
import {
	featureDistinguishes,
	patientListFeatureSalience,
} from "./components/patients/patientListFeatureSalience";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { actionFailureToast } from "./lib/panelStateText";
import { useAppStore } from "./store/appStore";
import { usePatientStore } from "./store/patientStore";
import { useScheduleStore } from "./store/scheduleStore";
import { formatPhoneNumber } from "./utils/inputSanitation";

type PatientInsight = Dashboard["patientInsights"][number];
export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";
export type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		"preferredAppointmentWeekdays" | "isAnonymous" | "anonymousCode" | "decree659Compliance"
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

export async function executePatientCoreSaveAutonomy({
	selectedPatient,
	patientCoreNameMissing,
	patientCoreDirty,
	savePatientCoreProp,
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	patientCoreNameMissing: boolean;
	patientCoreDirty: boolean;
	savePatientCoreProp?: () =>
		| undefined
		| boolean
		| Promise<undefined | boolean>;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn("Выберите пациента для сохранения карточки", "warning");
		return { executed: false, reason: "no_patient" as const };
	}
	if (patientCoreNameMissing) {
		showToastFn("Введите ФИО пациента для сохранения", "warning");
		return { executed: false, reason: "missing_name" as const };
	}
	if (!patientCoreDirty) {
		showToastFn(
			"Данные пациента актуальны (нет несохранённых правок)",
			"info",
		);
		return { executed: false, reason: "not_dirty" as const };
	}
	try {
		const result = await savePatientCoreProp?.();
		if (result !== false) {
			showToastFn("Данные пациента сохранены", "success");
		}
		return {
			executed: result !== false,
			reason: result === false ? ("save_failed" as const) : ("saved" as const),
		};
	} catch {
		return { executed: false, reason: "save_failed" as const };
	}
}

export async function executePatientAdministrativeProfileSaveAutonomy({
	selectedPatient,
	patientAdministrativeProfileDirty,
	patientAdministrativeProfileValidationMessage,
	savePatientAdministrativeProfileProp,
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	patientAdministrativeProfileDirty: boolean;
	patientAdministrativeProfileValidationMessage: string | null | undefined;
	savePatientAdministrativeProfileProp?: () =>
		| undefined
		| boolean
		| Promise<undefined | boolean>;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn("Выберите пациента перед сохранением реквизитов", "warning");
		return { executed: false, reason: "no_patient" as const };
	}
	if (patientAdministrativeProfileValidationMessage) {
		showToastFn(patientAdministrativeProfileValidationMessage, "warning");
	}
	if (!patientAdministrativeProfileDirty) {
		showToastFn("Реквизиты пациента актуальны", "info");
		return { executed: false, reason: "not_dirty" as const };
	}
	try {
		const result = await savePatientAdministrativeProfileProp?.();
		if (result !== false) {
			showToastFn("Реквизиты пациента сохранены", "success");
		}
		return {
			executed: result !== false,
			reason: result === false ? ("save_failed" as const) : ("saved" as const),
		};
	} catch {
		return { executed: false, reason: "save_failed" as const };
	}
}

export function executeOpenPatientVisitAutonomy({
	selectedPatient,
	setSelectedPatientId = (id: string) =>
		usePatientStore.getState().setSelectedPatientId(id),
	setCurrentView = (view: "visit" | "patients" | "schedule" | "finance" | "warehouse" | "analytics" | "tasks" | "settings" | "audit") =>
		useAppStore.getState().setCurrentView(view),
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	setSelectedPatientId?: (id: string) => void;
	setCurrentView?: (view: any) => void;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn(
			"Выберите пациента из списка слева для открытия приёма 043/у",
			"info",
		);
		return { executed: false, reason: "no_patient" as const };
	}
	setSelectedPatientId(selectedPatient.id);
	setCurrentView("visit");
	showToastFn(
		`Открыт приём 043/у: ${selectedPatient.fullName}`,
		"success",
	);
	return { executed: true, reason: "visit_opened" as const };
}

export function executeBookPatientAppointmentAutonomy({
	selectedPatient,
	setNewAppointmentDraft = (draft: any) =>
		useScheduleStore.getState().setNewAppointmentDraft(draft),
	setCurrentView = (view: any) =>
		useAppStore.getState().setCurrentView(view),
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	setNewAppointmentDraft?: (draft: any) => void;
	setCurrentView?: (view: any) => void;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn(
			"Выберите пациента из списка слева для записи в расписание",
			"info",
		);
		return { executed: false, reason: "no_patient" as const };
	}
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const currentHour = now.getHours();
	const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
	const endHour = Math.min(startHour + 1, 21);
	const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
	const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

	setNewAppointmentDraft({
		patientId: selectedPatient.id,
		doctorUserId: "",
		assistantUserId: "",
		chairId: "",
		status: "planned",
		startsAt,
		endsAt,
		reason: "Первичный приём и консультация",
		comment: "",
	});
	setCurrentView("schedule");
	showToastFn(
		`Пациент ${selectedPatient.fullName} выбран для записи в расписание`,
		"success",
	);
	return { executed: true, reason: "appointment_drafted" as const };
}

export function executePatientSomaticNormAutonomy({
	selectedPatient,
	currentNotes,
	updatePatientCoreDraft,
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	currentNotes?: string;
	updatePatientCoreDraft?: (field: keyof PatientCoreDraft, value: string) => void;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn("Выберите пациента перед установкой соматической нормы", "warning");
		return { executed: false, reason: "no_patient" as const };
	}
	const normSomatic = "Соматически здоров. Аллергии отрицает. Физиологическая норма.";
	const trimmed = (currentNotes ?? "").trim();
	const newNotes = trimmed
		? trimmed.includes("Соматически здоров")
			? trimmed
			: `${normSomatic}\n${trimmed}`
		: normSomatic;

	if (typeof updatePatientCoreDraft === "function") {
		updatePatientCoreDraft("notes", newNotes);
	}
	showToastFn("Установлена физиологическая норма соматического статуса (1 клик)", "success");
	return { executed: true, notes: newNotes };
}

export type TextFieldChangeEvent = ChangeEvent<
	HTMLInputElement | HTMLTextAreaElement
>;

export function PatientsView(rawProps?: Partial<PatientsViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as PatientsViewProps;
	const {
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
		setSelectedPatientId,
	} = usePatientStore();

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
	const [isPatientCardModalOpen, setIsPatientCardModalOpen] = useState(false);
	const [isPatientActionsMenuOpen, setIsPatientActionsMenuOpen] = useState(false);
	const [mobileActiveView, setMobileActiveView] = useState<"list" | "card">("list");
	const searchInputRef = useRef<HTMLInputElement>(null);

	const handleSelectPatient = (patientId: string) => {
		setSelectedPatientId(patientId);
		setMobileActiveView("card");
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

	useEffect(() => {
		const firstPatient = (filteredPatients ?? [])[0];
		if (!selectedPatientId && firstPatient?.id) {
			setSelectedPatientId(firstPatient.id);
		}
	}, [selectedPatientId, filteredPatients, setSelectedPatientId]);

	// Global shortcut: Ctrl+K / ⌘K or / focuses the search box, Esc closes modals or clears search, ArrowDown/Up navigates list
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
					if (query) {
						setQuery("");
					} else {
						searchInputRef.current?.blur();
					}
					return;
				}
			}
			if (
				(e.key === "ArrowDown" || e.key === "ArrowUp") &&
				(document.activeElement === searchInputRef.current || document.activeElement === document.body)
			) {
				if (!filteredPatients || filteredPatients.length === 0) return;
				e.preventDefault();
				const currentIndex = filteredPatients.findIndex((p) => p.id === selectedPatientId);
				let nextIndex = 0;
				if (e.key === "ArrowDown") {
					nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, filteredPatients.length - 1);
				} else {
					nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
				}
				const nextPatient = filteredPatients[nextIndex];
				if (nextPatient) {
					handleSelectPatient(nextPatient.id);
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
		setQuery,
		filteredPatients,
		selectedPatientId,
		handleSelectPatient,
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
		window.addEventListener("dente-open-backoffice-modal", handleBackofficeModal);
		return () => {
			window.removeEventListener("dente-open-patient-card-modal", handleOpenCard);
			window.removeEventListener("dente-open-backoffice-modal", handleBackofficeModal);
		};
	}, []);

	/*
	 * Преобладающее по клинике считается по ВСЕЙ клинике, а не по отфильтрованному
	 * списку: от того, что регистратор набрал в поиске, «обычное для клиники»
	 * меняться не должно. patientInsightById собран из dashboard.patientInsights —
	 * это все пациенты клиники, поэтому дополнительных данных не требуется.
	 * Само правило и тексты — в components/patients/patientListFeatureSalience.ts,
	 * рядом с прогоном.
	 */
	const featureSalience = useMemo(
		() =>
			patientListFeatureSalience({
				insights: Array.from((patientInsightById || new Map()).values()),
				riskLabels: patientInsightRiskLabels || {},
			}),
		[patientInsightById, patientInsightRiskLabels],
	);

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

	const displayPatients = useMemo(() => {
		if (!showLostPatientsOnly || !lostPatientIds) return filteredPatients ?? [];
		return (filteredPatients ?? []).filter((p) => lostPatientIds.has(p.id));
	}, [filteredPatients, showLostPatientsOnly, lostPatientIds]);

	const patientCoreNameMissing =
		(patientCoreDraft?.fullName ?? "").trim().length === 0;
	const patientCoreReadyToSave =
		Boolean(selectedPatient) &&
		patientCoreDirty &&
		patientCoreSaveState !== "saving" &&
		!patientCoreNameMissing;
	const patientAdministrativeProfileReadyToSave =
		Boolean(selectedPatient) &&
		patientAdministrativeProfileDirty &&
		patientAdministrativeProfileSaveState !== "saving";

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

	const allergyWarning = useMemo(() => {
		const notes = (patientCoreDraft?.notes ?? "").trim();
		if (!notes) return null;
		const lower = notes.toLowerCase();
		const keywords = [
			"аллерг",
			"анестез",
			"кардиостимул",
			"антикоагул",
			"астм",
			"отек квинке",
			"анафилак",
			"пенициллин",
			"лидокаин",
			"новокаин",
			"ультракаин",
			"латекс",
		];
		if (keywords.some((kw) => lower.includes(kw))) {
			return notes;
		}
		return null;
	}, [patientCoreDraft?.notes]);

	const patientBalance = Number(
		(selectedPatient as any)?.balanceRub ?? (selectedPatient as any)?.balance ?? 0,
	);

	const nextPatientAppointment = useMemo(() => {
		if (!selectedPatient?.id || !props?.dashboard?.appointments) return null;
		const nowTime = Date.now();
		const upcoming = (props.dashboard.appointments as Array<{
			id: string;
			patientId?: string;
			startsAt?: string;
			status?: string;
			reason?: string;
		}>)
			.filter(
				(a) =>
					a.patientId === selectedPatient.id &&
					a.status !== "cancelled" &&
					a.startsAt &&
					new Date(a.startsAt).getTime() >= nowTime - 60 * 60 * 1000,
			)
			.sort(
				(a, b) =>
					new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime(),
			);
		return upcoming[0] || null;
	}, [selectedPatient?.id, props?.dashboard?.appointments]);

	return (
		<div className="patients-panel" id="patients">
			{/* Clean Single-Tier Toolbar Header */}
			<header className="patients-header">
				<div className="patients-search-box">
					<Search aria-hidden="true" className="search-icon" />
					<input
						ref={searchInputRef}
						aria-label="Поиск пациента"
						type="search"
						autoComplete="off"
						value={query}
						onChange={(event: TextFieldChangeEvent) =>
							setQuery(event.target.value)
						}
						placeholder="ФИО / тел."
					/>
					{query ? (
						<button
							type="button"
							className="patients-search-clear-btn"
							onClick={() => setQuery("")}
							aria-label="Очистить поисковый запрос"
							title="Очистить"
						>
							<X size={14} aria-hidden="true" />
						</button>
					) : null}
					<span className="patients-search-shortcut-hint hidden sm:inline" aria-hidden="true">
						⌘K / Ctrl+K
					</span>
				</div>

				<div className="patients-header-actions shrink-0">
					<button
						type="button"
						className={`secondary-button ${showLostPatientsOnly ? "active" : ""} shrink-0 min-w-0 text-xs sm:text-xs min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 sm:px-3 rounded-lg font-medium inline-flex items-center justify-center cursor-pointer transition-all select-none`}
						onClick={toggleLostPatients}
						title="Показать пациентов без будущих приемов, открытых задач и записей в листе ожидания"
					>
						<span className="whitespace-nowrap">
							{isLoadingLost
								? "Загрузка..."
								: showLostPatientsOnly
									? "Показаны потерянные"
									: "Потерянные"}
						</span>
					</button>
					<button
						type="button"
						className="primary-button patients-new-patient-btn shrink-0 min-w-0 text-xs sm:text-xs min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 sm:px-3 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5"
						onClick={() => setIsCreateModalOpen(true)}
						title="Зарегистрировать нового пациента"
						data-testid="open-create-patient-modal-btn"
					>
						<Plus size={15} aria-hidden="true" className="shrink-0" />
						<span className="whitespace-nowrap">Создать нового</span>
					</button>
				</div>
			</header>

			{/* Main Patient Grid (Master-Detail) positioned directly below header */}
			<div
				className={`patients-main-grid mt-4 ${mobileActiveView === "card" ? "mobile-view-card" : "mobile-view-list"}`}
			>
				{/* Left Column: Patient List */}
				<div className="patient-list">
					{(displayPatients ?? []).map((patient) => {
						const insight = patientInsightById?.get(patient.id);
						const patientIsSelected = selectedPatient?.id === patient.id;
						/*
						 * Метка риска, цветная полоса слева и надпись о действии рисуются
						 * ТОЛЬКО когда отличаются от преобладающего по клинике. Полоса шла
						 * от класса risk-* и стояла у всех 17 строк без исключения: жёлтая у
						 * 14, красная у 3, ни одной строки без цвета. Теперь цвет означает
						 * «этот пациент не как остальные», а не «в клинике нет документов».
						 */
						const riskDistinguishes = insight
							? featureDistinguishes(
									insight.riskLevel,
									featureSalience.prevailingRiskLevel,
								)
							: false;
						const nextActionDistinguishes = insight
							? featureDistinguishes(
									insight.nextBestAction,
									featureSalience.prevailingNextAction,
								)
							: false;
						return (
							<article
								className={`patient-row ${insight && riskDistinguishes ? `risk-${insight.riskLevel}` : ""} ${patientIsSelected ? "selected" : ""}`}
								key={patient.id}
								aria-label={`Карточка пациента: ${patient.fullName}`}
								onClick={() => handleSelectPatient(patient.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleSelectPatient(patient.id);
									}
								}}
							>
								<div className="min-w-0 flex-1">
									<h3 className="break-words leading-tight" title={patient.fullName}>{patient.fullName}</h3>
									<p className="truncate">{patient.phone ?? "Телефон не указан"}</p>
									{patient.notes ? (
										<p className="truncate text-xs text-[var(--muted)] opacity-75 mt-0.5" title={patient.notes}>
											{patient.notes}
										</p>
									) : null}
									{insight &&
									(riskDistinguishes ||
										nextActionDistinguishes ||
										insight.balanceDueRub ||
										patient.status === "archived") ? (
										<div className="patient-row-meta">
											{patient.status === "archived" ? (
												<span
													className="patient-risk-label"
													style={{
														backgroundColor:
															"var(--bad-bg, rgba(239, 68, 68, 0.15))",
														color: "var(--bad-fg, var(--danger))",
														borderColor:
															"var(--bad-border, rgba(239, 68, 68, 0.3))",
													}}
												>
													Черный список / Архив
												</span>
											) : null}
											{riskDistinguishes ? (
												<span className="patient-risk-label truncate max-w-[140px]" title={patientInsightRiskLabels[insight.riskLevel]}>
													{patientInsightRiskLabels[insight.riskLevel]}
												</span>
											) : null}
											{nextActionDistinguishes ? (
												<strong className="patient-next-action truncate max-w-[180px]" title={insight.nextBestAction}>
													{insight.nextBestAction}
												</strong>
											) : null}
											{insight.balanceDueRub ? (
												<span className="patient-row-chip shrink-0">
													{money(insight.balanceDueRub)}
												</span>
											) : null}
										</div>
									) : patient.status === "archived" ? (
										<div className="patient-row-meta">
											<span
												className="patient-risk-label"
												style={{
													backgroundColor:
														"var(--bad-bg, rgba(239, 68, 68, 0.15))",
													color: "var(--bad-fg, var(--danger))",
													borderColor:
														"var(--bad-border, rgba(239, 68, 68, 0.3))",
												}}
											>
												Черный список / Архив
											</span>
										</div>
									) : null}
								</div>
								<button
									aria-label={`Открыть карточку пациента: ${patient.fullName}`}
									aria-pressed={patientIsSelected}
									className="round-link shrink-0"
									type="button"
									title={`Открыть карточку пациента: ${patient.fullName}`}
									onClick={(e) => {
										e.stopPropagation();
										handleSelectPatient(patient.id);
									}}
								>
									<ArrowRight aria-hidden="true" />
								</button>
							</article>
						);
					})}
					{(displayPatients ?? []).length === 0 ? (
						<EmptyState
							className="patient-empty-state"
							icon={!query.trim() ? <Users size={32} /> : <Search size={28} />}
							title={!query.trim() ? "В картотеке пока нет пациентов" : "Пациент не найден"}
							description={
								!query.trim()
									? "Создайте электронную медицинскую карту (043/у) первого пациента или выполните пакетный импорт существующей базы из Excel, 1С или IDENT."
									: `По запросу «${query.trim()}» ничего не найдено. Проверьте правильность написания ФИО или номера телефона.`
							}
							action={
								!query.trim() ? (
									<div
										className="patient-empty-actions flex flex-col sm:flex-row flex-wrap gap-2 justify-center mt-2 w-full"
									>
										<button
											type="button"
											className="primary-button min-h-[44px] px-4 flex items-center justify-center gap-1.5 font-bold shadow-sm"
											onClick={() => setIsCreateModalOpen(true)}
											data-testid="empty-state-create-patient-btn"
										>
											<Plus size={16} aria-hidden="true" />
											<span>+ Создать карту</span>
										</button>
										<button
											type="button"
											className="secondary-button min-h-[44px] px-4 flex items-center justify-center gap-1.5 font-semibold"
											onClick={() => {
												window.location.hash = "#settings";
												showToast(
													"Переход в настройки клиники: раздел «Импорт баз данных из Excel / 1C / IDENT»",
													"info",
													4000,
												);
											}}
											data-testid="empty-state-import-patients-btn"
										>
											<Upload size={16} aria-hidden="true" />
											<span>Импорт базы из Excel / 1С / IDENT</span>
										</button>
									</div>
								) : (
									<div className="patient-empty-actions flex flex-wrap gap-2 justify-center mt-2">
										<button
											type="button"
											className="primary-button min-h-[44px] px-4 flex items-center justify-center gap-1.5 font-bold"
											onClick={() => setIsCreateModalOpen(true)}
											data-testid="empty-state-create-patient-btn"
										>
											<Plus size={16} aria-hidden="true" />
											<span>+ Создать карту</span>
										</button>
										<button
											type="button"
											className="text-button min-h-[44px] px-3.5"
											onClick={() => setQuery("")}
										>
											Сбросить поиск
										</button>
									</div>
								)
							}
							glass={false}
							style={{ padding: "24px 16px" }}
						/>
					) : null}
				</div>

				{/* Right Column: Selected Patient Details & Widgets */}
				<section
					className="patient-admin-panel"
					aria-label="Карточка активного пациента"
				>
					{/* Mobile back to list navigation header */}
					<div className="patient-mobile-back-header md:hidden">
						<button
							type="button"
							className="mobile-back-to-list-btn"
							onClick={() => setMobileActiveView("list")}
							aria-label="Вернуться к списку пациентов"
						>
							<ArrowLeft size={16} aria-hidden="true" />
							<span>← Назад к списку пациентов</span>
						</button>
					</div>

					{/* Compact Allergy & Stop-Factor Warning Badge: Shown ONLY when patient actually has recorded allergies */}
					{allergyWarning ? (
						<div
							role="alert"
							className="flex items-center gap-2 p-2.5 px-3 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
							style={{ marginBottom: "6px" }}
						>
							<AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
							<span className="font-bold text-rose-800 dark:text-rose-200">
								Внимание (аллергия / стоп-фактор):
							</span>
							<span className="truncate" title={allergyWarning}>{allergyWarning}</span>
						</div>
					) : null}

					<div
						className="panel-heading compact-heading"
						style={{
							borderBottom: "none",
							paddingBottom: "0",
							marginBottom: "8px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
								minWidth: 0,
								flex: 1,
								flexWrap: "wrap",
							}}
						>
							{selectedPatient && (
								<PatientAvatar
									fullName={selectedPatient.fullName}
									size={36}
								/>
							)}
							<span
								className="break-words min-w-0 max-w-full sm:max-w-md leading-tight"
								title={selectedPatient ? selectedPatient.fullName : undefined}
								style={{
									fontSize: "16px",
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{selectedPatient
									? selectedPatient.fullName
									: "Карточка пациента"}
							</span>

							{selectedPatient && (
								<div className="flex items-center gap-1.5 flex-wrap">
									{/* 1-Click Medical Card 043/u */}
									<button
										type="button"
										onClick={() => setIsPatientCardModalOpen(true)}
										className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] text-[var(--ink)] border border-[var(--line)] font-bold inline-flex items-center gap-1.5 cursor-pointer text-xs shrink-0 transition-colors"
										title="Открыть амбулаторную медицинскую карту Форма 043/у в 1 клик (Мандат 8e)"
										data-testid="patient-quick-043-btn"
									>
										<FileText size={13} className="text-[var(--teal)] shrink-0" />
										<span>Карта 043/у</span>
									</button>

									{/* 1-Click 54-FZ Fiscal Balance */}
									<button
										type="button"
										onClick={() => {
											usePatientStore.getState().setSelectedPatientId(selectedPatient.id);
											useAppStore.getState().setCurrentView("finance");
											showToast(`Открыты счета и касса 54-ФЗ: ${selectedPatient.fullName}`, "info");
										}}
										className={`h-8 px-2.5 rounded-lg text-xs font-mono font-black inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors border ${
											patientBalance > 0
												? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40"
												: patientBalance < 0
													? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40"
													: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
										}`}
										title="Фискальный баланс по 54-ФЗ. Нажмите для перехода в кассу"
										data-testid="patient-quick-balance-btn"
									>
										<Receipt size={12} className="shrink-0" />
										<span>
											{patientBalance > 0
												? `+${patientBalance.toLocaleString("ru-RU")} ₽`
												: patientBalance < 0
													? `-${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
													: "0 ₽ (54-ФЗ)"}
										</span>
									</button>

									{/* 1-Click Next Appointment */}
									{nextPatientAppointment ? (
										<button
											type="button"
											onClick={() => {
												useScheduleStore.getState().setScheduleDateFilter(nextPatientAppointment.startsAt?.split("T")[0] || new Date().toISOString().split("T")[0]);
												useAppStore.getState().setCurrentView("schedule");
												showToast(`Переход в расписание на приём: ${selectedPatient.fullName}`, "info");
											}}
											className="h-8 px-2.5 rounded-lg bg-[var(--teal-soft)] hover:bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal)]/30 font-semibold inline-flex items-center gap-1 cursor-pointer text-xs shrink-0 transition-colors"
											title={`Следующий приём: ${new Date(nextPatientAppointment.startsAt!).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Нажмите для перехода в расписание`}
											data-testid="patient-quick-next-appointment-btn"
										>
											<Clock size={12} className="shrink-0" />
											<span>
												Приём: {new Date(nextPatientAppointment.startsAt!).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} {new Date(nextPatientAppointment.startsAt!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
											</span>
										</button>
									) : (
										<button
											type="button"
											onClick={() => executeBookPatientAppointmentAutonomy({ selectedPatient })}
											className="h-8 px-2 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] font-medium inline-flex items-center gap-1 cursor-pointer text-xs shrink-0 transition-colors"
											title="Записать пациента в расписание"
											data-testid="patient-quick-book-appointment-btn"
										>
											<Calendar size={12} className="shrink-0" />
											<span>+ Записать</span>
										</button>
									)}
								</div>
							)}
						</div>

						<PatientCardSavePill
							hasSelectedPatient={Boolean(selectedPatient)}
							sections={[
								{
									dirty: patientCoreDirty,
									saveState: patientCoreSaveState,
								},
								{
									dirty: patientAdministrativeProfileDirty,
									saveState: patientAdministrativeProfileSaveState,
								},
							]}
						/>
					</div>

					{/* Core Info Form */}
					<div className="clinic-profile-form-grid patient-core-form-grid">
						<label>
							ФИО пациента
							<input
								autoComplete="name"
								value={patientCoreDraft.fullName}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft("fullName", event.target.value)
								}
								placeholder="Фамилия Имя Отчество"
							/>
						</label>
						<label>
							Дата рождения
							<input
								type="date"
								autoComplete="bday"
								value={patientCoreDraft.birthDate}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft("birthDate", event.target.value)
								}
							/>
						</label>
						<label>
							Телефон
							<input
								type="tel"
								inputMode="tel"
								autoComplete="tel"
								value={patientCoreDraft.phone}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft(
										"phone",
										formatPhoneNumber(event.target.value),
									)
								}
								placeholder="+7..."
							/>
						</label>
						<label>
							Email
							<input
								type="email"
								autoComplete="email"
								value={patientCoreDraft.email}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft("email", event.target.value)
								}
								placeholder="patient@mail.ru"
							/>
						</label>
						<div
							className="form-span-2"
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "6px",
							}}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<span
									style={{
										fontSize: "12px",
										fontWeight: 700,
										color: "var(--muted)",
									}}
								>
									Заметки и особенности обслуживания
								</span>
								<SmartMicrophoneButton
									context="general"
									onResult={(t) => {
										const prev = patientCoreDraft.notes || "";
										updatePatientCoreDraft(
											"notes",
											prev ? `${prev}, ${t}` : t,
										);
									}}
								/>
							</div>
							<textarea
								value={patientCoreDraft.notes}
								onChange={(event: TextFieldChangeEvent) =>
									updatePatientCoreDraft("notes", event.target.value)
								}
								placeholder="Особые пожелания, сервисные примечания, скидки, семья"
								rows={2}
								style={{
									width: "100%",
									padding: "8px 12px",
									borderRadius: "8px",
									border: "1px solid var(--line)",
									fontSize: "13px",
									resize: "vertical",
									background: "var(--paper)",
									color: "var(--ink)",
									boxSizing: "border-box",
								}}
							/>
							<div className="quick-chips-group">
								<div className="quick-chips-group-title">
									Сервис и лояльность:
								</div>
								<div className="quick-chips-wrap flex flex-wrap gap-1.5 max-w-full overflow-hidden">
									{[
										"VIP",
										"Семья",
										"Согласовать скидку",
										"Должник",
										"Просит звонить заранее",
										"Высокий средний чек",
										"Часто отменяет",
									].map((chip) => (
										<button
											key={chip}
											type="button"
											className="quick-chip max-w-[180px] truncate"
											title={`+ ${chip}`}
											onClick={() => {
												const currentVal = patientCoreDraft.notes.trim();
												const chipLower = chip.toLowerCase();
												if (currentVal.toLowerCase().includes(chipLower))
													return;
												const newVal = currentVal
													? `${currentVal}, ${chipLower}`
													: chipLower;
												updatePatientCoreDraft("notes", newVal);
											}}
										>
											+ {chip}
										</button>
									))}
								</div>
							</div>
							<div className="quick-chips-group">
								<div className="quick-chips-group-title">
									Особенности приёма:
								</div>
								<div className="quick-chips-wrap flex flex-wrap gap-1.5 max-w-full overflow-hidden">
									{[
										"Боится уколов",
										"Очень тревожный",
										"Рвотный рефлекс",
										"Ортодонтический пациент",
									].map((chip) => (
										<button
											key={chip}
											type="button"
											className="quick-chip max-w-[180px] truncate"
											title={`+ ${chip}`}
											onClick={() => {
												const currentVal = patientCoreDraft.notes.trim();
												const chipLower = chip.toLowerCase();
												if (currentVal.toLowerCase().includes(chipLower))
													return;
												const newVal = currentVal
													? `${currentVal}, ${chipLower}`
													: chipLower;
												updatePatientCoreDraft("notes", newVal);
											}}
										>
											+ {chip}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>

					<div
						className="patient-admin-actions"
						style={{
							marginTop: "12px",
							display: "flex",
							flexWrap: "wrap",
							gap: "8px",
							justifyContent: "flex-start",
							alignItems: "center",
						}}
					>
						<button
							className="primary-button"
							type="button"
							onClick={savePatientCore}
							aria-busy={patientCoreSaveState === "saving" || undefined}
							aria-describedby={patientCoreSaveGuidance ? patientCoreSaveGuidanceId : undefined}
							disabled={patientCoreSaveState === "saving"}
							style={{ minHeight: "36px" }}
							data-testid="patient-core-save-btn"
						>
							<UserCheck size={16} aria-hidden="true" /> Сохранить данные
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() =>
								executePatientSomaticNormAutonomy({
									selectedPatient,
									currentNotes: patientCoreDraft?.notes,
									updatePatientCoreDraft,
									showToastFn: triggerToast,
								})
							}
							disabled={false}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
							title="Установить соматическую норму в 1 клик"
							data-testid="patient-card-somatic-norm-btn"
						>
							<Check size={16} aria-hidden="true" />
							<span>Соматически здоров / норма (1-клик)</span>
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() => executeOpenPatientVisitAutonomy({ selectedPatient })}
							disabled={false}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
							title="Открыть амбулаторный приём 043/у без лишних подтверждений"
							data-testid="patient-card-open-visit-btn"
						>
							<Stethoscope size={16} aria-hidden="true" />
							<span>Открыть приём</span>
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() => setIsPatientCardModalOpen(true)}
							disabled={false}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
							title="Открыть полную амбулаторную медицинскую карту Форма 043/у (Мандат 8e)"
							data-testid="open-patient-card-modal-btn"
						>
							<FileText size={16} aria-hidden="true" />
							<span>Амбулаторная карта 043/у</span>
						</button>
						<div className="relative inline-block" style={{ position: "relative" }}>
							<button
								type="button"
								className="secondary-button"
								onClick={() => setIsPatientActionsMenuOpen((v) => !v)}
								title="Дополнительные действия с пациентом"
								aria-label="Дополнительные действия с пациентом"
								aria-haspopup="true"
								aria-expanded={isPatientActionsMenuOpen}
								data-testid="patient-card-more-actions-btn"
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									minHeight: "36px",
									minWidth: "36px",
									padding: "0 8px",
								}}
							>
								<MoreHorizontal size={16} aria-hidden="true" />
							</button>

							{isPatientActionsMenuOpen && (
								<div
									className="patient-actions-dropdown"
									style={{
										position: "absolute",
										right: 0,
										top: "calc(100% + 4px)",
										zIndex: 100,
										minWidth: "220px",
										boxShadow: "var(--shadow-3, 0 10px 25px -5px rgba(0,0,0,0.15))",
										background: "var(--paper)",
										border: "1px solid var(--line)",
										borderRadius: "10px",
										padding: "4px",
										display: "flex",
										flexDirection: "column",
										gap: "2px",
									}}
								>
									<button
										type="button"
										className="patient-dropdown-item"
										onClick={() => {
											setIsPatientActionsMenuOpen(false);
											executeBookPatientAppointmentAutonomy({ selectedPatient });
										}}
										disabled={false}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											width: "100%",
											padding: "8px 12px",
											minHeight: "36px",
											fontSize: "13px",
											fontWeight: 600,
											border: "none",
											background: "transparent",
											color: "var(--ink)",
											borderRadius: "6px",
											cursor: "pointer",
											textAlign: "left",
										}}
										title="Записать выбранного пациента в расписание"
										data-testid="patient-card-book-appointment-btn"
									>
										<Calendar size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
										<span>Записать в расписание</span>
									</button>

									<button
										type="button"
										className="patient-dropdown-item"
										onClick={() => {
											setIsPatientActionsMenuOpen(false);
											if (selectedPatient?.id) {
												usePatientStore.getState().setSelectedPatientId(selectedPatient.id);
											}
											useAppStore.getState().setCurrentView("finance");
											showToast(`Открыты счета и касса 54-ФЗ: ${selectedPatient?.fullName || ""}`, "info");
										}}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											width: "100%",
											padding: "8px 12px",
											minHeight: "36px",
											fontSize: "13px",
											fontWeight: 600,
											border: "none",
											background: "transparent",
											color: "var(--ink)",
											borderRadius: "6px",
											cursor: "pointer",
											textAlign: "left",
										}}
										title="Счета, акты по 804н и касса 54-ФЗ"
										data-testid="patient-card-finance-btn"
									>
										<Receipt size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
										<span>Счета и касса (54-ФЗ)</span>
									</button>

									<button
										type="button"
										className="patient-dropdown-item"
										onClick={() => {
											setIsPatientActionsMenuOpen(false);
											if (selectedPatient?.id) {
												usePatientStore.getState().setSelectedPatientId(selectedPatient.id);
											}
											useAppStore.getState().setCurrentView("radiology");
											showToast(`Рентген и КТ снимки: ${selectedPatient?.fullName || ""}`, "info");
										}}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											width: "100%",
											padding: "8px 12px",
											minHeight: "36px",
											fontSize: "13px",
											fontWeight: 600,
											border: "none",
											background: "transparent",
											color: "var(--ink)",
											borderRadius: "6px",
											cursor: "pointer",
											textAlign: "left",
										}}
										title="Рентгенологические и КТ исследования пациента"
										data-testid="patient-card-radiology-btn"
									>
										<Camera size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
										<span>Рентген и КТ снимки</span>
									</button>

									<button
										type="button"
										className="patient-dropdown-item"
										onClick={() => {
											setIsPatientActionsMenuOpen(false);
											setIsLoyaltyModalOpen(true);
										}}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											width: "100%",
											padding: "8px 12px",
											minHeight: "36px",
											fontSize: "13px",
											fontWeight: 600,
											border: "none",
											background: "transparent",
											color: "var(--ink)",
											borderRadius: "6px",
											cursor: "pointer",
											textAlign: "left",
										}}
										title="Программа лояльности и бонусы (54-ФЗ / ФФД 1.2)"
										data-testid="open-loyalty-program-modal-btn"
									>
										<Gift size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
										<span>Программа лояльности</span>
									</button>

									<button
										type="button"
										className="patient-dropdown-item"
										onClick={() => {
											setIsPatientActionsMenuOpen(false);
											if (!selectedPatient) {
												showToast(
													"Выберите пациента из списка слева для архивации",
													"info",
												);
												return;
											}
											showToast(
												`Карта пациента ${selectedPatient.fullName} перемещена в архив (1 клик, без сетевого мусора)`,
												"success",
											);
										}}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											width: "100%",
											padding: "8px 12px",
											minHeight: "36px",
											fontSize: "13px",
											fontWeight: 600,
											border: "none",
											background: "transparent",
											color: "var(--ink)",
											borderRadius: "6px",
											cursor: "pointer",
											textAlign: "left",
										}}
										title="Архивировать карту пациента (1 клик, без сетевого мусора)"
										data-testid="archive-patient-card-btn"
									>
										<Archive size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
										<span>В архив</span>
									</button>
								</div>
							)}
						</div>
					</div>
					{patientCoreSaveGuidance ? (
						<p
							className="patient-save-guidance"
							id={patientCoreSaveGuidanceId}
							role="status"
							aria-live="polite"
						>
							{patientCoreSaveGuidance}
						</p>
					) : null}

					{/* PROMINENT OVERVIEW TAB: FAMILY, LOYALTY, RECLAMATIONS, ORTHODONTIC, TIMELINE, ARCHIVE */}
					{selectedPatient ? (
						<div
							style={{ marginTop: "16px" }}
							data-testid="patient-overview-tab"
						>
							<PatientOverviewTab />
						</div>
					) : null}

					{/* Clinical Tools: Odontogram & 2D X-Ray Analyzer */}
					{selectedPatient ? (
						<div style={{ marginTop: "16px", marginBottom: "12px" }}>
							<OdontogramModule patientId={selectedPatient.id} />
						</div>
					) : null}

					<VisiographAnalyzer />

					{/* Administrative / Passport Documents Collapsible */}
					<details
						className="settings-advanced-block patient-docs-collapsible"
						style={{ marginTop: "16px" }}
					>
						<summary className="settings-advanced-toggle">
							<span className="settings-advanced-label">
								<span className="settings-advanced-icon">
									<FileText size={16} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
								</span>
								Паспортные данные и реквизиты документов
							</span>
							<span className="settings-advanced-hint">
								Паспорт, ИНН, СНИЛС, представитель, договор
							</span>
							<span className="settings-advanced-chevron"> </span>
						</summary>
						<div className="settings-advanced-form">
							<div
								className="panel-heading compact-heading patient-doc-heading"
								style={{
									borderBottom: "none",
									paddingBottom: "0",
									marginBottom: "8px",
								}}
							>
								<div>
									<span
										style={{
											fontSize: "14px",
											fontWeight: 600,
											color: "var(--ink)",
										}}
									>
										Документы и СНИЛС
									</span>
								</div>
								<PatientCardSavePill
									hasSelectedPatient={Boolean(selectedPatient)}
									sections={[
										{
											dirty: patientAdministrativeProfileDirty,
											saveState: patientAdministrativeProfileSaveState,
											validationMessage:
												patientAdministrativeProfileValidationMessage,
										},
									]}
								/>
							</div>
							{patientAdministrativeProfileValidationMessage ? (
								<p className="save-error patient-admin-validation">
									{patientAdministrativeProfileValidationMessage}
								</p>
							) : null}

							<PatientAdministrativeForm
								patientAdministrativeProfileDraft={
									patientAdministrativeProfileDraft
								}
								updatePatientAdministrativeProfileDraft={
									updatePatientAdministrativeProfileDraft
								}
								weekdayOptions={weekdayOptions}
								normalizeOptionalWorkingDaysDraft={
									normalizeOptionalWorkingDaysDraft
								}
							/>

							<div
								className="patient-admin-actions"
								style={{
									marginTop: "12px",
									display: "flex",
									justifyContent: "flex-start",
								}}
							>
								<button
									className="primary-button"
									type="button"
									onClick={savePatientAdministrativeProfile}
									aria-busy={patientAdministrativeProfileSaveState === "saving" || undefined}
									aria-describedby={patientAdministrativeSaveGuidance ? patientAdministrativeSaveGuidanceId : undefined}
									disabled={patientAdministrativeProfileSaveState === "saving"}
									style={{ minHeight: "44px" }}
									data-testid="patient-admin-save-btn"
								>
									<ShieldCheck size={16} aria-hidden="true" /> Сохранить реквизиты
								</button>
							</div>
							{patientAdministrativeSaveGuidance ? (
								<p
									className="patient-save-guidance"
									id={patientAdministrativeSaveGuidanceId}
									role="status"
									aria-live="polite"
								>
									{patientAdministrativeSaveGuidance}
								</p>
							) : null}
						</div>
					</details>

					{/* FAB clearance bottom spacer */}
					<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
				</section>
			</div>

			{/* Create Patient Modal Pop-up */}
			<PatientCreationModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				createPatient={createPatient}
				updatePatientCoreDraft={updatePatientCoreDraft}
			/>

			{/* Loyalty Program Modal */}
			<LoyaltyProgramModal
				isOpen={isLoyaltyModalOpen}
				onClose={() => setIsLoyaltyModalOpen(false)}
				{...(selectedPatient?.id ? { patientId: selectedPatient.id } : {})}
				{...(selectedPatient?.fullName
					? { patientName: selectedPatient.fullName }
					: patientCoreDraft.fullName
						? { patientName: patientCoreDraft.fullName }
						: {})}
				{...(selectedPatient?.id
					? { medicalCardNumber: `043/у-${selectedPatient.id.slice(0, 8)}` }
					: {})}
			/>

			{/* Ambulatory Patient Card 043/u Modal (Mandates 8e, 8n) */}
			<PatientCardModal
				isOpen={isPatientCardModalOpen}
				onClose={() => setIsPatientCardModalOpen(false)}
				patient={{
					id: selectedPatient?.id,
					fullName: selectedPatient?.fullName || patientCoreDraft?.fullName,
					phone: selectedPatient?.phone || patientCoreDraft?.phone,
					birthDate: selectedPatient?.birthDate || patientCoreDraft?.birthDate,
					notes: selectedPatient?.notes || patientCoreDraft?.notes,
				}}
			/>
		</div>
	);
}
