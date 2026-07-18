import type {
	Dashboard,
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "./AppHelpers";
import { AnamnesisPanel } from "./components/AnamnesisPanel";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";
import { OdontogramModule } from "./components/odontogram/OdontogramModule";
import { PatientJourneyTimeline } from "./components/PatientJourneyTimeline";
import { PatientClinicalTab } from "./components/patients/PatientClinicalTab";
import { PatientDocsTab } from "./components/patients/PatientDocsTab";
import { PatientFamilyCard } from "./components/patients/PatientFamilyCard";
import { PatientOverviewTab } from "./components/patients/PatientOverviewTab";
import { PatientsSearchHeader } from "./components/patients/PatientsSearchHeader";
import { PatientsSidebar } from "./components/patients/PatientsSidebar";
import { ComparativePlannerDashboard } from "./components/plan/ComparativePlannerDashboard";
import { useAppLogicContext } from "./contexts/AppLogicContext";
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

export function PatientsView() {
	const appLogic = useAppLogicContext();
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
		dashboard,
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
	} = appLogic;

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
						>
							← Назад к списку пациентов
						</button>
					)}

					{selectedPatient && (
						<nav className="patients-tabs-nav" aria-label="Разделы карточки пациента">
							<button
								className={`patients-tab-btn${patientTab === "overview" ? " patients-tab-btn--active" : ""}`}
								onClick={() => setPatientTab("overview")}
								type="button"
							>
								Обзор профиля
							</button>
							<button
								className={`patients-tab-btn${patientTab === "clinical" ? " patients-tab-btn--active" : ""}`}
								onClick={() => setPatientTab("clinical")}
								type="button"
							>
								Медицина (Зубы и Снимки)
							</button>
							<button
								className={`patients-tab-btn${patientTab === "plans" ? " patients-tab-btn--active" : ""}`}
								onClick={() => setPatientTab("plans")}
								type="button"
							>
								Сметы и Планы
							</button>
							<button
								className={`patients-tab-btn${patientTab === "docs" ? " patients-tab-btn--active" : ""}`}
								onClick={() => setPatientTab("docs")}
								type="button"
							>
								Документы и Реквизиты
							</button>
						</nav>
					)}

					<section
						className="patient-admin-panel"
						aria-label="Административные данные активного пациента"
					>
						{patientTab === "overview" && <PatientOverviewTab />}
						{patientTab === "clinical" && <PatientClinicalTab />}
						{patientTab === "plans" && <ComparativePlannerDashboard />}
						{patientTab === "docs" && <PatientDocsTab />}
					</section>
				</main>
			</div>
		</motion.div>
	);

}
