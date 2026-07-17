import type {
	Dashboard,
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import { motion, AnimatePresence } from "framer-motion";
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
import { PatientsSidebar } from "./components/patients/PatientsSidebar";
import { PatientsSearchHeader } from "./components/patients/PatientsSearchHeader";
import { usePatientStore } from "./store/patientStore";
import { useVisitStore } from "./store/visitStore";

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
			<PatientsSearchHeader
				query={query}
				setQuery={setQuery}
				createPatient={createPatient}
				updatePatientCoreDraft={updatePatientCoreDraft}
			/>
			<div
				className={`patients-content-area ${selectedPatientId ? "patient-selected" : "no-patient-selected"}`}
			>
				<PatientsSidebar
					filteredPatients={filteredPatients}
					patientInsightById={patientInsightById}
					selectedPatient={selectedPatient}
					patientInsightRiskLabels={patientInsightRiskLabels}
					money={money}
				/>

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
