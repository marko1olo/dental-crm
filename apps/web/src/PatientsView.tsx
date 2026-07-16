import type {
	Dashboard,
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "./AppHelpers";
import { AnamnesisPanel } from "./components/AnamnesisPanel";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";
import { OdontogramModule } from "./components/odontogram/OdontogramModule";
import { ComparativePlannerDashboard } from "./components/plan/ComparativePlannerDashboard";
import { PatientJourneyTimeline } from "./components/PatientJourneyTimeline";
import { PatientClinicalTab } from "./components/patients/PatientClinicalTab";
import { PatientDocsTab } from "./components/patients/PatientDocsTab";
import { PatientFamilyCard } from "./components/patients/PatientFamilyCard";
import { PatientOverviewTab } from "./components/patients/PatientOverviewTab";
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

export type PatientsViewProps = {
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
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

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
	const [patientTab, setPatientTab] = useState<
		"overview" | "clinical" | "plans" | "docs"
	>("overview");
	const [insuranceContracts, setInsuranceContracts] = useState<any[]>([]);

	useEffect(() => {
		fetch("/api/insurance/contracts", {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : []))
			.then((data) => {
				setInsuranceContracts(Array.isArray(data) ? data : []);
			})
			.catch((err) => console.error("Failed to load VHI contracts", err));
	}, []);

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
							onBlur={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget)) {
									setShowHints(false);
								}
							}}
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

					{selectedPatient && (
						<div
							className="patients-tabs-nav"
							style={{
								display: "flex",
								gap: "8px",
								marginBottom: "24px",
								borderBottom: "1px solid var(--line)",
								paddingBottom: "12px",
							}}
						>
							<button
								className={`tab-btn ${patientTab === "overview" ? "active" : ""}`}
								onClick={() => setPatientTab("overview")}
								style={{
									padding: "8px 16px",
									background:
										patientTab === "overview"
											? "var(--brand-50)"
											: "transparent",
									color:
										patientTab === "overview"
											? "var(--brand-600)"
											: "var(--slate-600)",
									border: "none",
									borderRadius: "8px",
									fontWeight: 600,
									cursor: "pointer",
									transition: "all 0.2s",
								}}
							>
								Обзор профиля
							</button>
							<button
								className={`tab-btn ${patientTab === "clinical" ? "active" : ""}`}
								onClick={() => setPatientTab("clinical")}
								style={{
									padding: "8px 16px",
									background:
										patientTab === "clinical"
											? "var(--brand-50)"
											: "transparent",
									color:
										patientTab === "clinical"
											? "var(--brand-600)"
											: "var(--slate-600)",
									border: "none",
									borderRadius: "8px",
									fontWeight: 600,
									cursor: "pointer",
									transition: "all 0.2s",
								}}
							>
								Медицина (Зубы и Снимки)
							</button>
							<button
								className={`tab-btn ${patientTab === "plans" ? "active" : ""}`}
								onClick={() => setPatientTab("plans")}
								style={{
									padding: "8px 16px",
									background:
										patientTab === "plans"
											? "var(--brand-50)"
											: "transparent",
									color:
										patientTab === "plans"
											? "var(--brand-600)"
											: "var(--slate-600)",
									border: "none",
									borderRadius: "8px",
									fontWeight: 600,
									cursor: "pointer",
									transition: "all 0.2s",
								}}
							>
								Сметы и Планы
							</button>
							<button
								className={`tab-btn ${patientTab === "docs" ? "active" : ""}`}
								onClick={() => setPatientTab("docs")}
								style={{
									padding: "8px 16px",
									background:
										patientTab === "docs" ? "var(--brand-50)" : "transparent",
									color:
										patientTab === "docs"
											? "var(--brand-600)"
											: "var(--slate-600)",
									border: "none",
									borderRadius: "8px",
									fontWeight: 600,
									cursor: "pointer",
									transition: "all 0.2s",
								}}
							>
								Документы и Реквизиты
							</button>
						</div>
					)}

					<section
						className="patient-admin-panel"
						aria-label="Административные данные активного пациента"
					>
						{patientTab === "overview" && <PatientOverviewTab props={props} />}
						{patientTab === "clinical" && <PatientClinicalTab props={props} />}
						{patientTab === "plans" && <ComparativePlannerDashboard />}
						{patientTab === "docs" && <PatientDocsTab props={props} />}
					</section>
				</main>
			</div>
		</motion.div>
	);
}
