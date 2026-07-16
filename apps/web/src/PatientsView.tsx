import type {
	Dashboard,
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import { ArrowRight, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { denteAdminSecretRequestHeaders } from "./AppHelpers";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";
import { OdontogramModule } from "./components/odontogram/OdontogramModule";
import { PatientJourneyTimeline } from "./components/PatientJourneyTimeline";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { DictationHints } from "./DictationHints";
import { parsePatientDictationLocal } from "./lib/smartPatientParser";
import { SmartParsePreview } from "./SmartParsePreview";
import { usePatientStore } from "./store/patientStore";
import { useVisitStore } from "./store/visitStore";
import { formatPhoneNumber } from "./utils/inputSanitation";

type PatientInsight = Dashboard["patientInsights"][number];
type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";
type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		"preferredAppointmentWeekdays"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
};

type WeekdayOption = {
	label: string;
	value: number;
};

type PatientsViewProps = {
	dashboard: Dashboard | null;
	createPatient: () => void | Promise<void>;
	filteredPatients: Patient[];
	money: (amountRub: number) => string;
	normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
	patientAdministrativeProfileValidationMessage: string | null;
	patientInsightById: Map<string, PatientInsight>;
	patientInsightRiskLabels: Record<PatientInsight["riskLevel"], string>;
	query: string;
	savePatientAdministrativeProfile: () => void | Promise<void | boolean>;
	savePatientCore: () => void | Promise<void | boolean>;
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

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientsView(props: PatientsViewProps) {
	const {
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isPatientCreating,
		newRulePatientText,
		setSelectedPatientId,
		setPatientCoreDraft,
		setPatientCoreSaveState,
		setPatientCoreDirty,
		setPatientAdministrativeProfileDraft,
		setPatientAdministrativeProfileSaveState,
		setPatientAdministrativeProfileDirty,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		setIsPatientCreating,
		setNewRulePatientText,
	} = usePatientStore();

	const [smartInputText, setSmartInputText] = useState("");
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<any>(null);
	const [showHints, setShowHints] = useState(false);
	const [familyData, setFamilyData] = useState<any>(null);

	useEffect(() => {
		if (!selectedPatientId) {
			setFamilyData(null);
			return;
		}
		fetch(`/api/finance/family/patient/${selectedPatientId}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => {
				if (!res.ok) throw new Error("No family");
				return res.json();
			})
			.then((data) => setFamilyData(data))
			.catch(() => setFamilyData(null));
	}, [selectedPatientId]);

	useEffect(() => {
		// Memory Optimization: Flush heavy patient states on unmount
		return () => {
			usePatientStore.getState().reset();
			useVisitStore.getState().reset();
		};
	}, []);

	// Flush visit state and reset scroll when selected patient changes
	useEffect(() => {
		useVisitStore.getState().reset();

		// Smooth scroll reset to top of page/card to avoid CLS jump
		window.scrollTo({ top: 0, behavior: "instant" });
		const container =
			document.getElementById("workspace-content") ||
			document.querySelector(".workspace") ||
			document.querySelector(".patients-panel");
		if (container) {
			container.scrollTop = 0;
		}
	}, [selectedPatientId]);

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
		updatePatientAdministrativeProfileDraft,
		updatePatientCoreDraft,
		weekdayOptions,
	} = props;

	const patientNameReady = newPatientName.trim().length > 0;
	const patientCreatePhoneIssue =
		newPatientPhone.trim().length > 0 &&
		newPatientPhone.replace(/\D/g, "").length < 5;
	const patientCreateReady =
		patientNameReady && !patientCreatePhoneIssue && !isPatientCreating;
	const patientCreateGuidance = !patientNameReady
		? "Укажите ФИО пациента. Телефон и дату рождения можно добавить позже."
		: patientCreatePhoneIssue
			? "Телефон пациента слишком короткий. Исправьте номер или очистите поле."
			: null;
	const patientCoreNameMissing = patientCoreDraft.fullName.trim().length === 0;
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

	return (
		<motion.div 
			className="patients-panel glass-panel" 
			id="patients"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<header className="patients-header">
				<div className="patients-search-box">
					<Search aria-hidden="true" />
					<input
						aria-label="Поиск пациента"
						type="search"
						autoComplete="off"
						value={query}
						onChange={(event: TextFieldChangeEvent) =>
							setQuery(event.target.value)
						}
						placeholder="Поиск пациента: ФИО или телефон"
					/>
				</div>
				<div className="smart-create-group">
					<div className="smart-input-wrapper">
						<input
							aria-label="ФИО или 'Иванов 89001234567 12.05.1990'"
							autoComplete="name"
							value={smartInputText}
							onChange={(event: TextFieldChangeEvent) => {
								setSmartInputText(event.target.value);
								setNewPatientName(event.target.value); // Sync for normal usage
							}}
							onFocus={() => setShowHints(true)}
							onBlur={() => setTimeout(() => setShowHints(false), 200)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && smartInputText.trim()) {
									e.preventDefault();
									const parsed = parsePatientDictationLocal(smartInputText);
									setSmartParsedData(parsed);
									setShowSmartPreview(true);
									setShowHints(false);
								}
							}}
							placeholder="Умный ввод: ФИО Телефон Дата (Enter)"
						/>
						<SmartMicrophoneButton
							context="patient"
							onResult={(text) => {
								setSmartInputText(text);
								const parsed = parsePatientDictationLocal(text);
								setSmartParsedData(parsed);
								setShowSmartPreview(true);
								setShowHints(false);
							}}
							style={{
								position: "absolute",
								right: "4px",
								top: "50%",
								transform: "translateY(-50%)",
							}}
						/>
						<DictationHints isVisible={showHints} type="patient" />
						<SmartParsePreview
							isVisible={showSmartPreview}
							parsedData={smartParsedData}
							rawText={smartInputText}
							type="patient"
							onApply={(data: Record<string, string | undefined>) => {
								if (data) {
									setNewPatientName(data.fullName || smartInputText);
									if (data.phone)
										setNewPatientPhone(formatPhoneNumber(data.phone));
									if (data.birthDate) setNewPatientBirthDate(data.birthDate);
									if (data.notes) updatePatientCoreDraft("notes", data.notes);
								}
								setShowSmartPreview(false);
								setSmartInputText(data?.fullName || "");
							}}
							onManual={() => setShowSmartPreview(false)}
							onClose={() => setShowSmartPreview(false)}
						/>
					</div>
					<button
						className="btn-primary"
						type="button"
						title="Создать пациента"
						onClick={createPatient}
						aria-describedby={
							patientCreateGuidance ? "patient-create-guidance" : undefined
						}
						disabled={!patientCreateReady}
						aria-busy={isPatientCreating || undefined}
					>
						<Plus aria-hidden="true" size={18} /> Создать
					</button>
				</div>
			</header>

			{patientCreateGuidance ? (
				<p
					className="quick-create-guidance"
					id="patient-create-guidance"
					role="status"
					aria-live="polite"
				>
					{patientCreateGuidance}
				</p>
			) : null}
			<div
				className={`patients-content-area ${selectedPatientId ? "patient-selected" : "no-patient-selected"}`}
			>
				<aside className="patients-sidebar-column">
					<div className="patient-list">
						{filteredPatients.map((patient) => {
							const insight = patientInsightById.get(patient.id);
							const patientIsSelected = selectedPatient?.id === patient.id;
							return (
								<article
									className={`patient-row ${insight ? `risk-${insight.riskLevel}` : ""} ${patientIsSelected ? "selected" : ""}`}
									key={patient.id}
								>
									<div>
										<h3>{patient.fullName}</h3>
										<p>{patient.phone ?? "телефон не указан"}</p>
										{insight ? (
											<div className="patient-row-meta">
												<span>
													{patientInsightRiskLabels[insight.riskLevel]}
												</span>
												<strong className="patient-next-action">
													{insight.nextBestAction}
												</strong>
												{insight.balanceDueRub ? (
													<span>{money(insight.balanceDueRub)}</span>
												) : null}
											</div>
										) : null}
									</div>
									<button
										aria-label={`Открыть карточку пациента: ${patient.fullName}`}
										aria-pressed={patientIsSelected}
										className="round-link"
										type="button"
										title={`Открыть карточку пациента: ${patient.fullName}`}
										onClick={() => setSelectedPatientId(patient.id)}
									>
										<ArrowRight aria-hidden="true" />
									</button>
								</article>
							);
						})}
						{filteredPatients.length === 0 ? (
							<article className="patient-empty-state">
								<Search aria-hidden="true" />
								<div>
									<strong>Пациент не найден</strong>
									<p>
										Проверьте ФИО или телефон. Если это новый пациент, заполните
										строку выше и нажмите «Создать».
									</p>
								</div>
							</article>
						) : null}
					</div>
				</aside>

				<main className="patient-details-column">
					{selectedPatient && (
						<button
							className="mobile-back-to-list-btn"
							onClick={() => setSelectedPatientId(null)}
							style={{
								display: "none",
								marginBottom: "16px",
								background: "var(--paper)",
								border: "1px solid var(--line)",
								padding: "8px 16px",
								borderRadius: "8px",
								cursor: "pointer",
								fontWeight: 600,
							}}
						>
							← Назад к списку пациентов
						</button>
					)}
					<section
						className="patient-admin-panel"
						aria-label="Административные данные активного пациента"
					>
						<div
							className="panel-heading compact-heading patients-no-border-mb-8"
						>
							<div>
								<span
									style={{
										fontSize: "14px",
										fontWeight: 600,
										color: "var(--ink)",
									}}
								>
									Карточка пациента
								</span>
							</div>
							<span
								className={`status-pill status-${patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error" ? "cancelled" : "confirmed"}`}
							>
								{patientCoreSaveState === "saving"
									? "сохранение"
									: patientAdministrativeProfileSaveState === "saving"
										? "сохранение"
										: patientCoreSaveState === "error" ||
												patientAdministrativeProfileSaveState === "error"
											? "ошибка"
											: patientCoreDirty || patientAdministrativeProfileDirty
												? "Ждет сохранения"
												: "сохранено"}
							</span>
						</div>
						<div
							className="clinic-profile-form-grid patient-core-form-grid"
							style={{
								gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
							}}
						>
							<label className="form-span-2">
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
									placeholder="patient@example.ru"
								/>
							</label>
							<div
								className="form-span-2 patients-flex-col-gap-4"
							>
								<div
									className="patients-flex-between"
								>
									<span
										style={{
											fontSize: "13px",
											fontWeight: 600,
											color: "var(--muted)",
										}}
									>
										Заметки для команды
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
									onChange={(e) =>
										updatePatientCoreDraft("notes", e.target.value)
									}
									placeholder="важное для связи, приема и документов"
									style={{
										width: "100%",
										padding: "8px 12px",
										borderRadius: "8px",
										border: "1px solid var(--line)",
										fontSize: "14px",
										resize: "vertical",
									}}
								/>
								<div
									className="patients-chips-row"
								>
									{[
										"Очень тревожный",
										"Сложный пациент",
										"VIP",
										"Просит звонить заранее",
										"Часто отменяет",
										"Плохо переносит анестезию",
										"Должник",
										"Рвотный рефлекс",
									].map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => {
												const currentVal = patientCoreDraft.notes.trim();
												const newVal = currentVal
													? `${currentVal}, ${chip.toLowerCase()}`
													: chip;
												updatePatientCoreDraft("notes", newVal);
											}}
											style={{
												padding: "2px 8px",
												fontSize: "12px",
												background: "var(--paper-strong)",
												border: "1px solid var(--slate-200)",
												borderRadius: "12px",
												cursor: "pointer",
												color: "var(--slate-700)",
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = "var(--slate-200)";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = "var(--slate-100)";
											}}
										>
											+ {chip}
										</button>
									))}
								</div>
							</div>
						</div>
						<div
							className="patient-admin-actions patients-mt-16-flex"
						>
							<button
								className="primary-button"
								type="button"
								onClick={savePatientCore}
								aria-busy={patientCoreSaveState === "saving" || undefined}
								aria-describedby={
									patientCoreSaveGuidance
										? patientCoreSaveGuidanceId
										: undefined
								}
								disabled={!patientCoreReadyToSave}
							>
								<UserCheck aria-hidden="true" /> Сохранить карточку
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

						{/* Premium Clinical Experience (Full Width Odontogram + Grid) */}
						<div
							className="patients-flex-col-gap-24-my"
						>
							<div className="patients-w-100">
								{selectedPatientId && (
									<OdontogramModule
										patientId={selectedPatientId}
										pediatricMode={
											(props.dashboard?.clinicSettings?.profile as any)
												?.hasPediatricMode
										}
									/>
								)}
							</div>

							<div
								className="patient-clinical-grid patients-my-0"
							>
								<div className="clinical-col-left">
									<VisiographAnalyzer />
								</div>
								<div className="clinical-col-right">
									{familyData && (
										<div
											className="panel family-wallet-panel"
											style={{
												background: "rgba(24, 24, 27, 0.6)",
												backdropFilter: "blur(12px)",
												borderRadius: "12px",
												border: "1px solid rgba(63, 63, 70, 0.4)",
												padding: "16px",
												marginBottom: "20px",
											}}
										>
											<h3
												className="patients-glass-header"
											>
												👨‍👩‍👧‍👦 {familyData.name || "Семейная группа"}
											</h3>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													background: "rgba(9, 9, 11, 0.4)",
													padding: "12px",
													borderRadius: "8px",
													border: "1px solid rgba(63, 63, 70, 0.2)",
													marginBottom: "12px",
												}}
											>
												<span className="patients-glass-muted">
													Семейный баланс:
												</span>
												<span
													className="patients-glass-value"
												>
													{parseFloat(familyData.balance).toLocaleString(
														"ru-RU",
													)}{" "}
													₽
												</span>
											</div>
											<div
												className="patients-flex-col-gap-8"
											>
												<span
													className="patients-glass-label"
												>
													Члены семьи:
												</span>
												{familyData.members?.map((m: any) => (
													<div
														key={m.id}
														className="patients-glass-row"
													>
														<span
															style={{
																color:
																	m.id === selectedPatientId
																		? "#0ea5e9"
																		: "#e4e4e7",
																fontWeight:
																	m.id === selectedPatientId
																		? "bold"
																		: "normal",
															}}
														>
															{m.fullName}{" "}
															{m.id === selectedPatientId && " (текущий)"}
														</span>
														<span className="patients-glass-dim">
															{m.phone || "нет телефона"}
														</span>
													</div>
												))}
											</div>
										</div>
									)}
									{selectedPatientId && (
										<PatientJourneyTimeline
											patientId={selectedPatientId}
											dashboard={props.dashboard}
										/>
									)}
								</div>
							</div>
						</div>
						<details className="settings-advanced-block patient-docs-collapsible">
							<summary className="settings-advanced-toggle">
								<span className="settings-advanced-label">
									<span className="settings-advanced-icon">📝</span>
									Реквизиты и пожелания для документов
								</span>
								<span className="settings-advanced-hint">
									Паспорт, ИНН, представитель, удобное время
								</span>
								<span className="settings-advanced-chevron">▼</span>
							</summary>
							<div className="settings-advanced-form">
								<div
									className="panel-heading compact-heading patient-doc-heading patients-no-border-mb-8"
								>
									<div>
										<span
											style={{
												fontSize: "14px",
												fontWeight: 600,
												color: "var(--ink)",
											}}
										>
											Реквизиты для документов
										</span>
									</div>
									<span
										className={`status-pill status-${patientAdministrativeProfileSaveState === "error" || patientAdministrativeProfileValidationMessage ? "cancelled" : "confirmed"}`}
									>
										{patientAdministrativeProfileSaveState === "saving"
											? "сохранение"
											: patientAdministrativeProfileSaveState === "saved"
												? "сохранено"
												: patientAdministrativeProfileSaveState === "error" ||
														patientAdministrativeProfileValidationMessage
													? "ошибка"
													: patientAdministrativeProfileDirty
														? "Ждет сохранения"
														: "локально"}
									</span>
								</div>
								{patientAdministrativeProfileValidationMessage ? (
									<p className="save-error patient-admin-validation">
										{patientAdministrativeProfileValidationMessage}
									</p>
								) : null}
								<details
									className="patient-admin-details"
									style={{
										background: "var(--paper-soft)",
										padding: "12px",
										borderRadius: "8px",
										border: "1px solid var(--line)",
									}}
								>
									<summary
										style={{
											cursor: "pointer",
											fontWeight: 600,
											color: "var(--ink)",
										}}
									>
										Дополнительные документы и адреса (развернуть)
									</summary>
									<div className="patients-mt-12">
										<div className="clinic-profile-form-grid patient-admin-form-grid">
											<label>
												Документ пациента
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.identityDocument
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"identityDocument",
															event.target.value,
														)
													}
													placeholder="паспорт РФ 0000 000000"
												/>
											</label>
											<label>
												ИНН пациента
												<input
													inputMode="numeric"
													autoComplete="off"
													pattern="[0-9]*"
													value={patientAdministrativeProfileDraft.taxpayerInn}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"taxpayerInn",
															event.target.value
																.replace(/[^\d]/g, "")
																.slice(0, 12),
														)
													}
													placeholder="10 или 12 цифр"
												/>
											</label>
											<label>
												Адрес регистрации
												<input
													autoComplete="street-address"
													value={
														patientAdministrativeProfileDraft.registrationAddress
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"registrationAddress",
															event.target.value,
														)
													}
													placeholder="индекс, город, улица, дом"
												/>
											</label>
											<label>
												Адрес проживания
												<input
													autoComplete="street-address"
													value={
														patientAdministrativeProfileDraft.residentialAddress
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"residentialAddress",
															event.target.value,
														)
													}
													placeholder="если отличается"
												/>
											</label>
											<label>
												Полис / ДМС
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.insurancePolicyNumber
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"insurancePolicyNumber",
															event.target.value,
														)
													}
													placeholder="номер при наличии"
												/>
											</label>
											<label>
												СНИЛС
												<input
													inputMode="numeric"
													autoComplete="off"
													pattern="[0-9 -]*"
													value={patientAdministrativeProfileDraft.snils}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"snils",
															event.target.value,
														)
													}
													placeholder="000-000-000 00"
												/>
											</label>
											<label>
												Законный представитель
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.legalRepresentativeFullName
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"legalRepresentativeFullName",
															event.target.value,
														)
													}
													placeholder="ФИО представителя"
												/>
											</label>
											<label>
												Основание
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.legalRepresentativeRelationship
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"legalRepresentativeRelationship",
															event.target.value,
														)
													}
													placeholder="родитель, опекун, доверенность"
												/>
											</label>
											<label>
												Документ представителя
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.legalRepresentativeIdentityDocument
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"legalRepresentativeIdentityDocument",
															event.target.value,
														)
													}
													placeholder="паспорт / доверенность"
												/>
											</label>
											<label>
												Телефон представителя
												<input
													type="tel"
													inputMode="tel"
													autoComplete="tel"
													value={
														patientAdministrativeProfileDraft.legalRepresentativePhone
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"legalRepresentativePhone",
															formatPhoneNumber(event.target.value),
														)
													}
													placeholder="+7..."
												/>
											</label>
											<label className="form-span-2">
												Кому выдавать документы
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.preferredDocumentRecipient
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"preferredDocumentRecipient",
															event.target.value,
														)
													}
													placeholder="пациенту / представителю / доверенному лицу"
												/>
											</label>
											<div className="form-span-2 patient-appointment-preferences">
												<span>Удобные дни записи</span>
												<div
													className="weekday-toggle-row"
													role="group"
													aria-label="Удобные дни записи пациента"
												>
													{weekdayOptions.map((day) => {
														const weekdaySelected =
															patientAdministrativeProfileDraft.preferredAppointmentWeekdays.includes(
																day.value,
															);
														return (
															<button
																aria-pressed={weekdaySelected}
																className={weekdaySelected ? "active" : ""}
																key={`patient-weekday-${day.value}`}
																type="button"
																onClick={() => {
																	const currentDays =
																		patientAdministrativeProfileDraft.preferredAppointmentWeekdays;
																	const nextDays = weekdaySelected
																		? currentDays.filter(
																				(item) => item !== day.value,
																			)
																		: [...currentDays, day.value];
																	updatePatientAdministrativeProfileDraft(
																		"preferredAppointmentWeekdays",
																		normalizeOptionalWorkingDaysDraft(nextDays),
																	);
																}}
															>
																{day.label}
															</button>
														);
													})}
												</div>
											</div>
											<label>
												Удобно с
												<input
													type="time"
													value={
														patientAdministrativeProfileDraft.preferredAppointmentStart
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"preferredAppointmentStart",
															event.target.value,
														)
													}
												/>
											</label>
											<label>
												Удобно до
												<input
													type="time"
													value={
														patientAdministrativeProfileDraft.preferredAppointmentEnd
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"preferredAppointmentEnd",
															event.target.value,
														)
													}
												/>
											</label>
											<label className="form-span-2">
												Комментарий к записи
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.preferredAppointmentNote
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"preferredAppointmentNote",
															event.target.value,
														)
													}
													placeholder="например: только утро, не звонить после 19:00, нужен сопровождающий"
												/>
											</label>
											<label className="form-span-2">
												Основание обработки ПДн
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.dataProcessingBasisNote
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"dataProcessingBasisNote",
															event.target.value,
														)
													}
													placeholder="согласие пациента, представитель, договор, иной законный контекст"
												/>
											</label>
										</div>
									</div>
								</details>
								<div
									className="patient-admin-actions patients-mt-16-flex"
								>
									<button
										className="primary-button"
										type="button"
										onClick={savePatientAdministrativeProfile}
										aria-busy={
											patientAdministrativeProfileSaveState === "saving" ||
											undefined
										}
										aria-describedby={
											patientAdministrativeSaveGuidance
												? patientAdministrativeSaveGuidanceId
												: undefined
										}
										disabled={!patientAdministrativeProfileReadyToSave}
									>
										<ShieldCheck aria-hidden="true" /> Сохранить для документов
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
					</section>
				</main>
			</div>
		</motion.div>
	);
}
