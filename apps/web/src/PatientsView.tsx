import type {
	Dashboard,
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import {
	ArrowLeft,
	ArrowRight,
	ArrowRightLeft,
	Gift,
	Plus,
	Search,
	ShieldCheck,
	UserCheck,
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
import { PatientAdministrativeForm } from "./components/patient/PatientAdministrativeForm";
import { CreatePatientModal } from "./components/patients/CreatePatientModal";
import { PatientOverviewTab } from "./components/patients/PatientOverviewTab";
import { PatientBranchTransferModal } from "./components/patients/transfer/PatientBranchTransferModal";
import { PatientCardSavePill } from "./components/patients/patientCardSavePill";
import {
	featureDistinguishes,
	patientListFeatureSalience,
} from "./components/patients/patientListFeatureSalience";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { actionFailureToast } from "./lib/panelStateText";
import { usePatientStore } from "./store/patientStore";
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
		"preferredAppointmentWeekdays"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
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
};

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
	const [isBranchTransferModalOpen, setIsBranchTransferModalOpen] = useState(false);
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
		savePatientAdministrativeProfile,
		savePatientCore,
		selectedPatient,
		setQuery,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		weekdayOptions,
	} = props;

	useEffect(() => {
		const firstPatient = (filteredPatients ?? [])[0];
		if (!selectedPatientId && firstPatient?.id) {
			setSelectedPatientId(firstPatient.id);
		}
	}, [selectedPatientId, filteredPatients, setSelectedPatientId]);

	// Global shortcut: Ctrl+K or / focuses the search box
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (
				(e.ctrlKey && e.key.toLowerCase() === "k") ||
				(e.key === "/" &&
					document.activeElement?.tagName !== "INPUT" &&
					document.activeElement?.tagName !== "TEXTAREA")
			) {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
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
		patientAdministrativeProfileSaveState !== "saving" &&
		!patientAdministrativeProfileValidationMessage;
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
						placeholder="Поиск пациента по ФИО или телефону..."
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
						Ctrl+K
					</span>
				</div>

				<div className="patients-header-actions">
					<button
						type="button"
						className={`secondary-button ${showLostPatientsOnly ? "active" : ""}`}
						onClick={toggleLostPatients}
						disabled={isLoadingLost}
						title="Показать пациентов без будущих приемов, открытых задач и записей в листе ожидания"
						style={{
							backgroundColor: showLostPatientsOnly ? "var(--teal)" : undefined,
							color: showLostPatientsOnly ? "var(--on-teal, #fff)" : undefined,
							borderColor: showLostPatientsOnly ? "var(--teal)" : undefined,
							minHeight: "44px",
						}}
					>
						{isLoadingLost
							? "Загрузка..."
							: showLostPatientsOnly
								? "Показаны потерянные"
								: "Потерянные"}
					</button>
					<button
						type="button"
						className="primary-button patients-new-patient-btn"
						onClick={() => setIsCreateModalOpen(true)}
						title="Зарегистрировать нового пациента"
						data-testid="open-create-patient-modal-btn"
						style={{ minHeight: "44px" }}
					>
						<Plus size={18} aria-hidden="true" />
						<span>Создать нового</span>
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
								<div>
									<h3>{patient.fullName}</h3>
									<p>{patient.phone ?? "Телефон не указан"}</p>
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
														color: "var(--bad-fg, #ef4444)",
														borderColor:
															"var(--bad-border, rgba(239, 68, 68, 0.3))",
													}}
												>
													Черный список / Архив
												</span>
											) : null}
											{riskDistinguishes ? (
												<span className="patient-risk-label">
													{patientInsightRiskLabels[insight.riskLevel]}
												</span>
											) : null}
											{nextActionDistinguishes ? (
												<strong className="patient-next-action">
													{insight.nextBestAction}
												</strong>
											) : null}
											{insight.balanceDueRub ? (
												<span className="patient-row-chip">
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
													color: "var(--bad-fg, #ef4444)",
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
									className="round-link"
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
							icon={<Search size={28} />}
							title="Пациент не найден"
							description="Проверьте ФИО или телефон. Чтобы добавить нового пациента, нажмите кнопку ниже."
							action={
								<button
									type="button"
									className="primary-button"
									onClick={() => setIsCreateModalOpen(true)}
									style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "6px" }}
									data-testid="empty-state-create-patient-btn"
								>
									<Plus size={16} aria-hidden="true" />
									<span>Создать нового</span>
								</button>
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
							<span className="text-sm" aria-hidden="true">⚠️</span>
							<span className="font-bold text-rose-800 dark:text-rose-200">
								Внимание (аллергия / стоп-фактор):
							</span>
							<span className="truncate">{allergyWarning}</span>
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
								gap: "12px",
							}}
						>
							{selectedPatient && (
								<PatientAvatar
									fullName={selectedPatient.fullName}
									size={36}
								/>
							)}
							<span
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
								placeholder="ivanov@example.ru"
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
										"Денег не считает",
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
							disabled={!patientCoreReadyToSave}
							style={{ minHeight: "36px" }}
						>
							<UserCheck size={16} aria-hidden="true" /> Сохранить данные
						</button>
						<button
							type="button"
							className="secondary-button"
							onClick={() => setIsLoyaltyModalOpen(true)}
							title="Программа лояльности и бонусы (54-ФЗ / ФФД 1.2)"
							data-testid="open-loyalty-program-modal-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Gift size={16} aria-hidden="true" />
							<span>Программа лояльности</span>
						</button>
						<button
							type="button"
							className="secondary-button"
							onClick={() => setIsBranchTransferModalOpen(true)}
							title="Межфилиальный трансфер пациента, карты 043/у и нарядов ЗТЛ (152-ФЗ)"
							data-testid="open-branch-transfer-modal-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<ArrowRightLeft size={16} aria-hidden="true" />
							<span>Трансфер в филиал</span>
						</button>
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
								<span className="settings-advanced-icon">📄</span>
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
									disabled={!patientAdministrativeProfileReadyToSave}
									style={{ minHeight: "36px" }}
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
			<CreatePatientModal
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

			{/* Multi-Branch Patient Transfer & Centralized Lab Sync Modal */}
			{selectedPatient ? (
				<PatientBranchTransferModal
					isOpen={isBranchTransferModalOpen}
					onClose={() => setIsBranchTransferModalOpen(false)}
					patientId={selectedPatient.id}
					patientFullName={selectedPatient.fullName}
					patientBirthDate={selectedPatient.birthDate}
					patientPhone={selectedPatient.phone}
					patientPassport={selectedPatient.administrativeProfile?.identityDocument}
					patientSnils={selectedPatient.administrativeProfile?.snils}
					patientInn={selectedPatient.administrativeProfile?.taxpayerInn}
					balanceRub={selectedPatient.balanceRub ?? 0}
					onTransferCompleted={(snapshot) => {
						showToast(`Пациент ${snapshot.patientFullName} успешно передан в ${snapshot.targetBranch.shortNameRu}!`);
					}}
				/>
			) : null}
		</div>
	);
}
