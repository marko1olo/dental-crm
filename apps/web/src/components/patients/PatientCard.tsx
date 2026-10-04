/**
 * apps/web/src/components/patients/PatientCard.tsx
 *
 * DENTE Dental CRM — Каноническая карточка пациента и ЭМК (Apple Health Records HIG).
 *
 * МАНДАТЫ КЛИНИЧЕСКОЙ ЭРГОНОМИКИ:
 * 1. Apple Health Inset Card Architecture: четкая визуальная иерархия, крупные тач-таргеты (>= 44x44px).
 * 2. 1-клик звонок пациенту (tel:...), WhatsApp, фиксация физиологической нормы («Соматически здоров»).
 * 3. Сегментированный переключатель разделов: [ История визитов | Зубная формула | Соматика | Документы ].
 * 4. Бесшовная интеграция с PatientHistoryTab — хронологический таймлайн визитов с протоколом 043/у.
 * 5. Полная поддержка WCAG AAA во всех темах (Light, Dark, Night).
 */

import React, { useCallback, useMemo, useState } from "react";
import {
	AlertOctagon,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	CreditCard,
	Edit3,
	ExternalLink,
	FileText,
	HeartPulse,
	History,
	Phone,
	Plus,
	Printer,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	Users,
	Wallet,
} from "lucide-react";
import { ToothMolar, DentalForm043 } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
} from "./safetyMath";
import { PatientHistoryTab, type ClinicalVisitItem, DEFAULT_CLINICAL_VISITS } from "./PatientHistoryTab";
import { PatientDentalFormulaTab } from "./formula/PatientDentalFormulaTab";
import { SomaticAnamnesisCard } from "../clinical/SomaticAnamnesisCard";
import type { PatientGeneralInfo } from "./tabs/PatientGeneralInfoTab";
import type { Dashboard } from "@dental/shared";
import "./PatientHistoryTab.css";

// Re-export PatientCardModal for backwards compatibility
export { PatientCardModal } from "./PatientCardModal";
export type { PatientCardModalProps } from "./PatientCardModal";

export type PatientCardActiveTab = "timeline" | "formula" | "anamnesis" | "documents";

export interface PatientCardProps {
	patient?: PatientGeneralInfo | null | undefined;
	patientId?: string | null | undefined;
	safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	dashboard?: Dashboard | null | undefined;
	initialTab?: PatientCardActiveTab | undefined;
	visits?: ClinicalVisitItem[] | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	onEditPatient?: (() => void) | undefined;
	onPrintCard043?: (() => void) | undefined;
	className?: string | undefined;
}

export const DEMO_PATIENT_CARD_DATA: PatientGeneralInfo = {
	id: "01a00000-0000-0000-0000-000000000001",
	fullName: "Ковалёв Роман Станиславович",
	phone: "+7 (916) 789-01-23",
	birthDate: "1988-04-14",
	cardNumber: "К-4821",
	gender: "male",
	notes: "Повышенная чувствительность шеек зубов. Регулярная профгигиена раз в 6 месяцев.",
	acquisitionSource: "Рекомендация знакомых / Сарафанное радио",
};

export const PatientCard: React.FC<PatientCardProps> = React.memo(
	function PatientCard({
		patient: propPatient,
		patientId,
		safetyProfile: propSafetyProfile,
		dashboard,
		initialTab = "timeline",
		visits = DEFAULT_CLINICAL_VISITS,
		onNavigateToVisit,
		onNewAppointment,
		onEditPatient,
		onPrintCard043,
		className = "",
	}) {
		const [activeTab, setActiveTab] = useState<PatientCardActiveTab>(initialTab);

		const patientData = useMemo<PatientGeneralInfo>(() => {
			if (propPatient) return propPatient;
			if (patientId && dashboard?.patients) {
				const match = dashboard.patients.find((p) => p.id === patientId);
				if (match) {
					return {
						id: match.id,
						fullName: match.fullName,
						phone: match.phone,
						birthDate: match.birthDate,
						notes: match.notes,
						cardNumber: (match as { cardNumber?: string }).cardNumber || undefined,
					};
				}
			}
			return DEMO_PATIENT_CARD_DATA;
		}, [propPatient, patientId, dashboard]);

		const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(() => {
			return propSafetyProfile || DEFAULT_SOMATIC_HEALTHY_NORM;
		});

		const safetyEvaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(safetyProfile);
		}, [safetyProfile]);

		const handleApplyNorm = useCallback(() => {
			const clean = createHealthySomaticNormProfile();
			setSafetyProfile(clean);
			showToast("Применена физиологическая норма: соматически здоров (1 клик)", "success");
		}, []);

		const handleCopyPhone = useCallback(() => {
			if (patientData.phone && typeof navigator !== "undefined" && navigator.clipboard) {
				navigator.clipboard.writeText(patientData.phone);
				showToast(`Телефон ${patientData.phone} скопирован`, "info");
			}
		}, [patientData.phone]);

		const handlePrint = useCallback(() => {
			if (onPrintCard043) {
				onPrintCard043();
			} else if (typeof window !== "undefined") {
				window.print();
				showToast("Печать медицинской карты", "info");
			}
		}, [onPrintCard043]);

		// Format age
		const ageString = useMemo(() => {
			if (!patientData.birthDate) return "";
			const d = new Date(patientData.birthDate);
			if (Number.isNaN(d.getTime())) return "";
			const today = new Date();
			let age = today.getFullYear() - d.getFullYear();
			const m = today.getMonth() - d.getMonth();
			if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
				age--;
			}
			let word = "лет";
			const last = age % 10;
			const lastTwo = age % 100;
			if (lastTwo >= 11 && lastTwo <= 14) word = "лет";
			else if (last === 1) word = "год";
			else if (last >= 2 && last <= 4) word = "года";
			return `${age} ${word}`;
		}, [patientData.birthDate]);

		const initials = useMemo(() => {
			const name = patientData.fullName || "Пациент";
			return name
				.split(" ")
				.map((n) => n[0])
				.filter(Boolean)
				.slice(0, 2)
				.join("")
				.toUpperCase();
		}, [patientData.fullName]);

		return (
			<div
				className={`patient-card-root flex flex-col gap-4 w-full box-border text-[var(--ink)] ${className}`}
				data-testid="patient-card-component"
			>
				{/* ═══════════════════════════════════════════════════════════════════
				    1. PATIENT PROFILE HEADER CARD (Apple Health Inset Style)
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col gap-3.5">
					<div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
						<div className="flex items-center gap-3.5 min-w-0">
							{/* Initials Avatar */}
							<div className="w-12 h-12 rounded-2xl bg-teal-600 dark:bg-teal-700 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm select-none">
								{initials}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<h2 className="text-base sm:text-lg font-black text-[var(--ink)] m-0 truncate">
										{patientData.fullName || "Пациент без имени"}
									</h2>
									{patientData.cardNumber && (
										<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
											{patientData.cardNumber}
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap mt-0.5">
									{patientData.birthDate && (
										<span className="flex items-center gap-1">
											<Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
											<span>{patientData.birthDate}</span>
											{ageString && <span>({ageString})</span>}
										</span>
									)}
									{patientData.phone && (
										<span className="flex items-center gap-1">
											<Phone className="w-3.5 h-3.5 text-[var(--muted)]" />
											<a
												href={`tel:${patientData.phone}`}
												className="hover:underline text-[var(--ink)] font-medium"
											>
												{patientData.phone}
											</a>
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Quick Actions Header */}
						<div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
							<button
								type="button"
								onClick={handleApplyNorm}
								className="min-h-[40px] px-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
								title="Зафиксировать физиологическую норму в 1 клик"
								data-testid="btn-patient-card-somatic-norm"
							>
								<ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
								<span>✓ Норма</span>
							</button>

							<button
								type="button"
								onClick={handlePrint}
								className="min-h-[40px] px-3 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong,var(--paper))] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
								title="Распечатать карту Формы 043/у"
								data-testid="btn-patient-card-print-043"
							>
								<Printer className="w-4 h-4 text-[var(--muted)]" />
								<span>043/у</span>
							</button>

							{onEditPatient && (
								<button
									type="button"
									onClick={onEditPatient}
									className="min-h-[40px] px-3 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong,var(--paper))] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
									title="Редактировать данные"
								>
									<Edit3 className="w-4 h-4 text-[var(--muted)]" />
									<span>Правка</span>
								</button>
							)}
						</div>
					</div>

					{/* Somatic Safety Alert Banner (if risk flags present) */}
					{safetyEvaluation.activeFlags.length > 0 && (
						<div
							className={`p-3 rounded-xl flex items-center justify-between gap-2.5 border text-xs ${
								safetyEvaluation.hasCriticalStopFlags
									? "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-100"
									: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100"
							}`}
							role="alert"
						>
							<div className="flex items-center gap-2 min-w-0 flex-1">
								<AlertOctagon
									className={`w-4 h-4 shrink-0 ${
										safetyEvaluation.hasCriticalStopFlags
											? "text-rose-600 dark:text-rose-400 animate-pulse"
											: "text-amber-600 dark:text-amber-400"
									}`}
								/>
								<div className="flex items-center gap-1.5 flex-wrap">
									<strong className="text-[11px] uppercase tracking-wider">
										{safetyEvaluation.hasCriticalStopFlags
											? "Критический стоп-фактор:"
											: "Клиническое предупреждение:"}
									</strong>
									{safetyEvaluation.activeFlags.map((flag) => (
										<span
											key={flag.id}
											className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-white/40 dark:bg-black/30 border border-current"
										>
											{flag.shortBadge || flag.titleRu}
										</span>
									))}
								</div>
							</div>
							<button
								type="button"
								onClick={() => setActiveTab("anamnesis")}
								className="text-xs font-bold underline cursor-pointer shrink-0"
							>
								Детали
							</button>
						</div>
					)}

					{/* Apple HIG Segmented Navigation Control */}
					<div className="flex p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 overflow-x-auto scrollbar-none [scrollbar-width:none]">
						<button
							type="button"
							onClick={() => setActiveTab("timeline")}
							className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
								activeTab === "timeline"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="tab-segment-timeline"
						>
							<History className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>История визитов</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("formula")}
							className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
								activeTab === "formula"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="tab-segment-formula"
						>
							<ToothMolar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Зубная формула</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("anamnesis")}
							className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
								activeTab === "anamnesis"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="tab-segment-anamnesis"
						>
							<HeartPulse className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
							<span>Соматика & Безопасность</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("documents")}
							className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
								activeTab === "documents"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold border border-[var(--line)]"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="tab-segment-documents"
						>
							<FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
							<span>Документы & Выписки</span>
						</button>
					</div>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    2. TAB CONTENT
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="patient-card-tab-content">
					{activeTab === "timeline" && (
						<PatientHistoryTab
							patientId={patientData.id}
							patientName={patientData.fullName}
							visits={visits}
							dashboard={dashboard}
							onNavigateToVisit={onNavigateToVisit}
							onNewAppointment={onNewAppointment}
						/>
					)}

					{activeTab === "formula" && (
						<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
							<PatientDentalFormulaTab
								patientId={patientData.id || ""}
								patientBirthDate={patientData.birthDate}
								patientName={patientData.fullName}
							/>
						</div>
					)}

					{activeTab === "anamnesis" && (
						<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
							<SomaticAnamnesisCard
								initialProfile={safetyProfile}
								patientId={patientData.id}
								patientName={patientData.fullName}
								onSave={(newProfile) => setSafetyProfile(newProfile)}
								onApplyNorm={(normProfile) => setSafetyProfile(normProfile)}
							/>
						</div>
					)}

					{activeTab === "documents" && (
						<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col gap-3">
							<h3 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider m-0">
								Официальная документация ЭМК Формы 043/у (Приказ 834н)
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Амбулаторная медицинская карта, информированные согласия (ИДС) и выписки.
							</p>
							<div className="flex gap-2 flex-wrap pt-2">
								<button
									type="button"
									onClick={handlePrint}
									className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
								>
									<Printer className="w-4 h-4" />
									<span>Печать выписки из амбулаторной карты</span>
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	},
);

PatientCard.displayName = "PatientCard";
export default PatientCard;
