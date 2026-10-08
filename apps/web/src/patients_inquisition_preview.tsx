import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom/client";

import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";

import type { Patient, Dashboard } from "@dental/shared";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { PatientCardModal } from "./components/patients/PatientCardModal";
import { PatientsFilterToolbar } from "./components/patients/PatientsFilterToolbar";
import { PatientsMasterList } from "./components/patients/PatientsMasterList";
import { PatientDetailsPanel } from "./components/patients/PatientDetailsPanel";
import { patientListFeatureSalience } from "./components/patients/patientListFeatureSalience";
import { money } from "./utils/financeUtils";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
} from "./components/patients/safetyMath";
import { Users, FileText, Sun, Moon, HeartPulse, Wallet, PanelRightClose } from "lucide-react";
import {
	PatientAnamnesisTab,
	FamilyWalletModal,
	PatientDrawer,
	PatientDetailsModal,
} from "./components/patient";
import { AppLogicProvider, type AppLogicContextType } from "./contexts/AppLogicContext";
import { usePatientStore } from "./store/patientStore";

const DEMO_PATIENTS: any[] = [
	{
		id: "pat-voronova",
		fullName: "Воронова Екатерина Сергеевна",
		phone: "+7 (925) 876-54-32",
		birthDate: "1991-03-22",
		gender: "female",
		address: "г. Москва, ул. Арбат, д. 24, кв. 12",
		balanceRub: 4500,
		familyBalanceRub: 12500,
		familyGroupId: "fam-grp-001",
		docType: "passport_rf",
		passportSeries: "4512",
		passportNumber: "789123",
		notes: "Дентофобия, аллергоанамнез отягощен (пенициллин, латекс).",
		createdAt: "2026-02-10T10:00:00Z",
		updatedAt: "2026-10-01T15:30:00Z",
	},
	{
		id: "pat-smirnov",
		fullName: "Смирнов Дмитрий Иванович",
		phone: "+7 (916) 443-21-00",
		birthDate: "1984-11-15",
		gender: "male",
		address: "г. Москва, Ленинградский пр-т, д. 45",
		balanceRub: -8200,
		familyBalanceRub: 0,
		docType: "passport_rf",
		notes: "Задолженность по ортопедическому этапу. Гипертония II ст.",
		createdAt: "2026-03-14T11:00:00Z",
		updatedAt: "2026-09-28T14:20:00Z",
	},
	{
		id: "pat-kuznetsova",
		fullName: "Кузнецова Анна Михайловна",
		phone: "+7 (903) 111-22-33",
		birthDate: "1998-05-18",
		gender: "female",
		address: "г. Москва, ул. Тверская, д. 12",
		balanceRub: 0,
		familyBalanceRub: 0,
		notes: "Первичный приём. Острая боль в области зуба 4.6.",
		createdAt: "2026-10-07T09:00:00Z",
		updatedAt: "2026-10-07T09:00:00Z",
	},
	{
		id: "pat-ivanov",
		fullName: "Иванов Алексей Сергеевич",
		phone: "+7 (916) 123-45-67",
		birthDate: "1992-08-24",
		gender: "male",
		address: "г. Москва, ул. Профсоюзная, д. 88",
		balanceRub: 12000,
		familyBalanceRub: 12000,
		notes: "Соматически здоров. Плановая гигиена и санация.",
		createdAt: "2026-01-15T12:00:00Z",
		updatedAt: "2026-09-15T16:00:00Z",
	},
	{
		id: "pat-kovalev",
		fullName: "Ковалев Максим Андреевич",
		phone: "+7 (985) 999-88-77",
		birthDate: "1979-04-03",
		gender: "male",
		address: "г. Москва, ул. Новаторов, д. 14",
		balanceRub: 3500,
		familyBalanceRub: 3500,
		notes: "Имплантация 3.6, регулярный контроль.",
		createdAt: "2026-04-20T10:00:00Z",
		updatedAt: "2026-09-10T11:00:00Z",
	},
	{
		id: "pat-petrova",
		fullName: "Петрова Ольга Викторовна",
		phone: "+7 (926) 555-44-33",
		birthDate: "1989-12-09",
		gender: "female",
		address: "г. Москва, Кутузовский пр-т, д. 22",
		balanceRub: -3400,
		familyBalanceRub: 0,
		notes: "Долг за контрольный снимок КТ.",
		createdAt: "2026-05-12T14:00:00Z",
		updatedAt: "2026-08-25T17:30:00Z",
	},
	{
		id: "pat-morozov",
		fullName: "Морозов Артем Денисович",
		phone: "+7 (915) 222-33-44",
		birthDate: "2002-07-30",
		gender: "male",
		address: "г. Москва, ул. Вавилова, д. 5",
		balanceRub: 0,
		familyBalanceRub: 0,
		notes: "Первичная консультация ортодонта.",
		createdAt: "2026-10-06T15:00:00Z",
		updatedAt: "2026-10-06T15:00:00Z",
	},
	{
		id: "pat-sokolova",
		fullName: "Соколова Марина Юрьевна",
		phone: "+7 (905) 777-66-55",
		birthDate: "1975-09-14",
		gender: "female",
		address: "г. Москва, Ленинский пр-т, д. 102",
		balanceRub: 6000,
		familyBalanceRub: 18000,
		notes: "Архивный пациент. Курс ортопедического лечения завершен.",
		createdAt: "2025-11-01T10:00:00Z",
		updatedAt: "2026-01-20T12:00:00Z",
	},
];

const ALLERGIC_SAFETY_PROFILE: PatientClinicalSafetyProfile = {
	...DEFAULT_SOMATIC_HEALTHY_NORM,
	hasPenicillinAllergy: true,
	hasLatexAllergy: true,
	hasHypertension: true,
	hasCardiovascularDisease: true,
	takesBetaBlockers: true,
	customChronicNotes: "Аллергия на пенициллины и латекс. ГБ II ст. Риск гипертонического криза при стрессе.",
	customAllergyNotes: "Отек Квинке на ампициллин в 2018 г. Контактный дерматит на латексные перчатки.",
};

export function PatientsInquisitionPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as ThemeMode) || "light";
	const initialView = params.get("view") || "registry";

	const [theme, setTheme] = useState<ThemeMode>(initialTheme);
	const [activePreviewView, setActivePreviewView] = useState<"registry" | "card" | "anamnesis" | "family" | "drawer">(
		(initialView as any) || "registry",
	);

	const [query, setQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<"all" | "primary" | "debt" | "archive">("all");
	const [selectedPatientId, setSelectedPatientId] = useState<string>("pat-voronova");
	const [isCardModalOpen, setIsCardModalOpen] = useState(false);
	const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(ALLERGIC_SAFETY_PROFILE);

	useEffect(() => {
		const resolved = resolveTheme(theme, theme === "dark");
		applyThemeToRoot(document.documentElement, resolved);
	}, [theme]);

	const selectedPatient: any = useMemo(() => {
		return DEMO_PATIENTS.find((p) => p.id === selectedPatientId) || DEMO_PATIENTS[0] || {};
	}, [selectedPatientId]);

	const filteredPatients = useMemo(() => {
		return DEMO_PATIENTS.filter((p) => {
			if (categoryFilter === "primary" && p.id !== "pat-kuznetsova" && p.id !== "pat-morozov") {
				return false;
			}
			if (categoryFilter === "debt" && p.balanceRub >= 0) {
				return false;
			}
			if (categoryFilter === "archive" && p.id !== "pat-sokolova") {
				return false;
			}
			if (query.trim()) {
				const q = query.toLowerCase().trim();
				return (
					p.fullName.toLowerCase().includes(q) ||
					p.phone.replace(/\D/g, "").includes(q)
				);
			}
			return true;
		});
	}, [categoryFilter, query]);

	const counts = useMemo(() => ({
		countAll: DEMO_PATIENTS.length,
		countPrimary: 2,
		countDebt: 2,
		countArchive: 1,
	}), []);

	const featureSalience = useMemo(() => {
		return patientListFeatureSalience({
			insights: [],
			riskLabels: {},
		});
	}, []);

	const pagination = useMemo(() => ({
		visibleItems: filteredPatients,
		displayedCount: filteredPatients.length,
		totalCount: filteredPatients.length,
		hasMore: false,
		loadMore: () => {},
		loadAll: () => {},
	}), [filteredPatients]);

	useEffect(() => {
		usePatientStore.getState().setSelectedPatientId(selectedPatientId);
	}, [selectedPatientId]);

	const mockAppLogic = useMemo(() => {
		return {
			dashboard: {
				patients: DEMO_PATIENTS,
				appointments: [
					{
						id: "apt-1",
						patientId: selectedPatient.id,
						doctorId: "doc-1",
						doctorName: "Д-р Смирнов А.В.",
						room: "Кабинет 1",
						startsAt: new Date(Date.now() + 3600000).toISOString(),
						status: "confirmed",
						services: ["Консультация", "Лечение кариеса"],
					},
				],
				bills: [],
				branches: [{ id: "branch-1", name: "Флагманская клиника" }],
				currentBranch: "branch-1",
				services: [],
				doctors: [{ id: "doc-1", name: "Д-р Смирнов А.В.", specialty: "Стоматолог-терапевт" }],
				labOrders: [],
				prescriptions: [],
				tasks: [],
			},
			selectedPatient,
			selectedPatientId: selectedPatient.id,
			activePatient: selectedPatient,
			activeDoctor: { id: "doc-1", name: "Д-р Смирнов А.В.", role: "doctor" },
			auth: {
				user: { id: "doc-1", name: "Д-р Смирнов А.В.", role: "doctor" },
				activeBranchId: "branch-1",
				denteClinicalReadHeaders: () => ({ "Content-Type": "application/json" }),
				denteClinicalMutationHeaders: () => ({ "Content-Type": "application/json" }),
			},
			loadDashboard: async () => {},
			currentView: "patients",
			odontogramUseSurfaces: false,
			workspaceProfile: {
				features: {
					orthodontics: true,
					implantology: true,
					reclamations: true,
					familyGroups: true,
				},
			},
		} as unknown as AppLogicContextType;
	}, [selectedPatient]);

	const handleOpenCard = useCallback((patient?: Patient) => {
		if (patient) {
			setSelectedPatientId(patient.id);
		}
		setIsCardModalOpen(true);
	}, []);

	return (
		<AppLogicProvider value={mockAppLogic}>
			<div className="min-h-screen bg-[var(--paper-soft)] text-[var(--ink)] font-sans flex flex-col">
			{/* Top Bar with theme and mode switches */}
			<header
				data-testid="preview-header-bar"
				className="w-full px-6 py-2.5 bg-[var(--paper-strong)] border-b border-[var(--glass-border)] flex items-center justify-between gap-4 shadow-2xs z-30 flex-wrap"
			>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-white flex items-center justify-center font-bold text-sm shadow-xs">
						D
					</div>
					<div>
						<h1 className="text-sm font-black text-[var(--ink)] m-0 leading-tight">
							DENTE • Картотека пациентов и ЭМК 043/у
						</h1>
						<span className="text-[11px] text-[var(--muted)]">
							Сквозная цепочка: Fastify API → PostgreSQL 18 → React 19 • Мандат 8e
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* View Switcher */}
					<div className="dente-segmented-bar flex items-center p-0.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg">
						<button
							type="button"
							data-testid="tab-view-registry"
							onClick={() => setActivePreviewView("registry")}
							className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
								activePreviewView === "registry"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Users className="w-3.5 h-3.5" />
							<span>Реестр</span>
						</button>
						<button
							type="button"
							data-testid="tab-view-card"
							onClick={() => setActivePreviewView("card")}
							className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
								activePreviewView === "card"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<FileText className="w-3.5 h-3.5" />
							<span>Медкарта (043/у)</span>
						</button>
						<button
							type="button"
							data-testid="tab-view-anamnesis"
							onClick={() => setActivePreviewView("anamnesis")}
							className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
								activePreviewView === "anamnesis"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<HeartPulse className="w-3.5 h-3.5" />
							<span>Анамнез и аллергии</span>
						</button>
						<button
							type="button"
							data-testid="tab-view-family"
							onClick={() => setActivePreviewView("family")}
							className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
								activePreviewView === "family"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Wallet className="w-3.5 h-3.5" />
							<span>Семейный кошелек</span>
						</button>
						<button
							type="button"
							data-testid="tab-view-drawer"
							onClick={() => setActivePreviewView("drawer")}
							className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
								activePreviewView === "drawer"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<PanelRightClose className="w-3.5 h-3.5" />
							<span>Шторка</span>
						</button>
					</div>

					{/* Theme Switcher */}
					<div className="flex items-center gap-1">
						<button
							type="button"
							data-testid="btn-theme-light"
							onClick={() => setTheme("light")}
							className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								theme === "light"
									? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
									: "bg-[var(--paper-strong)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
							title="Светлая тема (Light)"
						>
							<Sun className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Светлая</span>
						</button>
						<button
							type="button"
							data-testid="btn-theme-dark"
							onClick={() => setTheme("dark")}
							className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								theme === "dark"
									? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
									: "bg-[var(--paper-strong)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
							title="Тёмная тема (Dark)"
						>
							<Moon className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Тёмная</span>
						</button>
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 p-4 md:p-6 flex flex-col overflow-hidden max-w-7xl w-full mx-auto">
				{activePreviewView === "registry" ? (
					<div
						data-testid="patients-registry-container"
						className="patients-panel flex-1 flex flex-col gap-3 min-h-[750px]"
					>
						{/* Clean 1-Row Filter & Search Toolbar */}
						<PatientsFilterToolbar
							query={query}
							onQueryChange={setQuery}
							onClearQuery={() => setQuery("")}
							filteredPatients={filteredPatients}
							onSelectPatient={(id) => setSelectedPatientId(id)}
							onOpenRecallsHub={() => {}}
							onOpenTactileSearch={() => {}}
							showLostPatientsOnly={false}
							onToggleLostPatients={() => {}}
							isLoadingLost={false}
							onOpenCreatePatient={() => handleOpenCard()}
							categoryFilter={categoryFilter}
							onCategoryFilterChange={setCategoryFilter}
							counts={counts}
						/>

						{/* Master-Detail Grid */}
						<div className="patients-main-grid flex-1 flex gap-4 min-h-[620px]">
							{/* Master List */}
							<div className="w-[420px] shrink-0 flex flex-col bg-[var(--paper-strong)] rounded-2xl border border-[var(--line)] p-2 shadow-xs overflow-hidden">
								<PatientsMasterList
									patients={filteredPatients}
									selectedPatientId={selectedPatientId}
									onSelectPatient={(id) => setSelectedPatientId(id)}
									featureSalience={featureSalience}
									money={money}
									pagination={pagination}
									onOpenVisit={() => {}}
									onBookAppointment={() => {}}
									onOpenPatientCard={(p) => handleOpenCard(p)}
									onOpenCreatePatient={() => handleOpenCard()}
									onClearSearch={() => setQuery("")}
									query={query}
								/>
							</div>

							{/* Detail Panel */}
							<div className="flex-1 flex flex-col bg-[var(--paper-strong)] rounded-2xl border border-[var(--line)] p-4 shadow-xs overflow-y-auto">
								<PatientDetailsPanel
									selectedPatient={selectedPatient}
									onBackToList={() => {}}
									onOpenVisit={() => {}}
									onOpenPatientCardModal={() => handleOpenCard(selectedPatient)}
									onOpenLoyaltyModal={() => {}}
									patientCoreDraft={{
										fullName: selectedPatient.fullName,
										phone: selectedPatient.phone,
										birthDate: selectedPatient.birthDate || "",
										email: selectedPatient.email || "",
										notes: selectedPatient.notes || "",
									}}
									updatePatientCoreDraft={() => {}}
									patientCoreSaveState="idle"
									patientCoreDirty={false}
									savePatientCore={() => {}}
									patientCoreSaveGuidance={null}
									patientCoreSaveGuidanceId="guidance-id"
									patientAdministrativeProfileDraft={{
										preferredAppointmentWeekdays: [],
										identityDocument: "passport_rf",
										identityDocumentSeries: "4512",
										identityDocumentNumber: "789123",
										insurancePolicyNumber: "",
										insuranceCompany: "",
										snils: "",
										inn: "",
										residenceAddress: selectedPatient.address || "",
										registrationAddress: selectedPatient.address || "",
										occupation: "",
										legalRepresentativeFullName: "",
										legalRepresentativePhone: "",
										legalRepresentativeRelationship: "",
										legalRepresentativeDocument: "",
										smsNotificationConsent: true,
										emailNotificationConsent: false,
										promotionalConsent: false,
									} as any}
									updatePatientAdministrativeProfileDraft={() => {}}
									patientAdministrativeProfileSaveState="idle"
									patientAdministrativeProfileDirty={false}
									savePatientAdministrativeProfile={() => {}}
									patientAdministrativeSaveGuidance={null}
									patientAdministrativeSaveGuidanceId="guidance-admin-id"
									patientAdministrativeProfileValidationMessage={null}
									weekdayOptions={[]}
									normalizeOptionalWorkingDaysDraft={(d: any) => d}
									executePatientSomaticNorm={() => {}}
									executeBookAppointment={() => {}}
								/>
							</div>
						</div>
					</div>
				) : activePreviewView === "card" ? (
					/* Direct Full PatientDetailsModal view */
					<div
						data-testid="patient-card-container"
						className="flex-1 flex items-center justify-center py-4"
					>
						<PatientDetailsModal
							isOpen={true}
							onClose={() => setActivePreviewView("registry")}
							patient={{
								id: selectedPatient.id,
								fullName: selectedPatient.fullName,
								phone: selectedPatient.phone,
								birthDate: selectedPatient.birthDate,
								patientBalanceRub: selectedPatient.balanceRub,
								medicalCardNumber: "48201",
								address: selectedPatient.address,
								notes: selectedPatient.notes,
							}}
							safetyProfile={safetyProfile}
							onSave={(_pat, prof) => {
								setSafetyProfile(prof);
							}}
							onApplySomaticNorm={() => {
								setSafetyProfile(createHealthySomaticNormProfile());
							}}
						/>
					</div>
				) : activePreviewView === "anamnesis" ? (
					/* Standalone PatientAnamnesisTab view */
					<div
						data-testid="patient-anamnesis-container"
						className="flex-1 p-2 sm:p-4 max-w-4xl mx-auto w-full"
					>
						<PatientAnamnesisTab
							patientId={selectedPatient.id}
							patientName={selectedPatient.fullName}
							initialProfile={safetyProfile}
							onSaveProfile={(prof) => setSafetyProfile(prof)}
							onApplySomaticNorm={() => setSafetyProfile(createHealthySomaticNormProfile())}
						/>
					</div>
				) : activePreviewView === "family" ? (
					/* Standalone FamilyWalletModal view */
					<div
						data-testid="patient-family-container"
						className="flex-1 flex items-center justify-center py-4"
					>
						<FamilyWalletModal
							isOpen={true}
							onClose={() => setActivePreviewView("registry")}
							patientId={selectedPatient.id}
							patientName={selectedPatient.fullName}
							familyData={{
								id: "fam-grp-001",
								name: "Семья Вороновых",
								balance: 12500,
								headPatientId: selectedPatient.id,
								members: [
									{
										id: selectedPatient.id,
										fullName: selectedPatient.fullName,
										phone: selectedPatient.phone,
									},
									{
										id: "pat-child-1",
										fullName: "Воронов Мирон Алексеевич",
										phone: "",
									},
									{
										id: "pat-spouse-1",
										fullName: "Воронов Алексей Сергеевич",
										phone: "+7 (916) 123-45-67",
									},
								],
							}}
						/>
					</div>
				) : (
					/* Standalone PatientDrawer view */
					<div
						data-testid="patient-drawer-container"
						className="flex-1 relative min-h-[600px]"
					>
						<div className="p-6 bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
							<h3 className="text-sm font-bold text-[var(--ink)] mb-2">
								Фоновый контекст врача / Регистратуры
							</h3>
							<p className="text-xs text-[var(--muted)]">
								Шторка пациента открыта как суверенный Tier 2 слой без вложенных модалок.
							</p>
						</div>
						<PatientDrawer
							isOpen={true}
							onClose={() => setActivePreviewView("registry")}
							patient={{
								id: selectedPatient.id,
								fullName: "Константинопольский-Преображенский Иннокентий Пантелеймонович",
								phone: "+7 (925) 876-54-32",
								birthDate: "1988-11-04",
								medicalCardNumber: "48201",
								patientBalanceRub: 4500,
							}}
							safetyProfile={safetyProfile}
							familyData={{
								id: "fam-grp-002",
								name: "Семья Константинопольских",
								balance: 25000,
								members: [
									{ id: selectedPatient.id, fullName: "Константинопольский-Преображенский Иннокентий Пантелеймонович" },
									{ id: "pat-wife", fullName: "Константинопольская Елена Викторовна" },
								],
							}}
							onOpenAnamnesis={() => setActivePreviewView("anamnesis")}
							onOpenFamilyWallet={() => setActivePreviewView("family")}
							onOpenFullCard={() => setActivePreviewView("card")}
						/>
					</div>
				)}

				{/* Floating PatientCardModal if triggered from registry */}
				{activePreviewView === "registry" && isCardModalOpen && (
					<PatientCardModal
						isOpen={isCardModalOpen}
						onClose={() => setIsCardModalOpen(false)}
						patient={{
							id: selectedPatient.id,
							fullName: selectedPatient.fullName,
							phone: selectedPatient.phone,
							birthDate: selectedPatient.birthDate,
							patientBalanceRub: selectedPatient.balanceRub,
							familyBalanceRub: (selectedPatient as any).familyBalanceRub ?? 12500,
							docType: selectedPatient.docType || "passport_rf",
							passportSeries: selectedPatient.passportSeries || "4512",
							passportNumber: selectedPatient.passportNumber || "789123",
							notes: selectedPatient.notes,
						}}
						safetyProfile={safetyProfile}
						initialSafetyProfile={safetyProfile}
						onSavePatient={(_pat, prof) => {
							setSafetyProfile(prof);
						}}
						onApplySomaticNorm={() => {
							setSafetyProfile(createHealthySomaticNormProfile());
						}}
					/>
				)}
			</main>
		</div>
		</AppLogicProvider>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<PatientsInquisitionPreviewApp />);
}
