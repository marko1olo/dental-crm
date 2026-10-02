import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertOctagon,
	Award,
	CreditCard,
	FileText,
	HeartPulse,
	History,
	Printer,
	ShieldCheck,
	User,
	Users,
	X,
} from "lucide-react";
import { PediatricBraveryDiplomaModal } from "../pediatric/PediatricBraveryDiplomaModal";
import { showToast } from "../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
} from "./safetyMath";
import {
	PatientGeneralInfoTab,
	type PatientGeneralInfo,
} from "./tabs/PatientGeneralInfoTab";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import {
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
} from "@dental/shared";

export const DEMO_SHOWCASE_MODAL_PATIENT: PatientGeneralInfo = {
	id: "01a00000-0000-0000-0000-000000000001",
	fullName: "Иванов Алексей Сергеевич",
	phone: "+7 (916) 123-45-67",
	birthDate: "1992-08-24",
	doctorClinicalNotes: "Дентофобия (страх бормашины). Аллергоанамнез не отягощен.",
	acquisitionSource: "Рекомендация знакомых / Сарафанное радио",
};

export const DEMO_SHOWCASE_MODAL_SAFETY: PatientClinicalSafetyProfile = {
	...DEFAULT_SOMATIC_HEALTHY_NORM,
	customChronicNotes: "Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания отрицает. Физиологическая норма.",
};

export {
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
};

/**
 * Возвращает правовой статус представителя по ст. 20 323-ФЗ и СК РФ ст. 64
 */
export function getRepresentativeLegalStatus(type: string | null | undefined): {
	isLegalRepresentative: boolean;
	labelRu: string;
	idsSigningAllowed: boolean;
	descriptionRu: string;
} {
	if (!type) {
		return {
			isLegalRepresentative: false,
			labelRu: "",
			idsSigningAllowed: false,
			descriptionRu: "Представитель не выбран",
		};
	}
	const match = STOMX_REPRESENTATIVE_CATALOG.find(
		(r) => r.nameRu === type || r.code === type,
	);
	const isLegal = match?.isLegalRepresentative ?? false;
	return {
		isLegalRepresentative: isLegal,
		labelRu: match?.nameRu ?? type,
		idsSigningAllowed: isLegal,
		descriptionRu: isLegal
			? "Законный представитель: имеет право подписывать согласия за несовершеннолетнего (ст. 20 323-ФЗ, ст. 64 СК РФ)"
			: "Член семьи: подписание согласий за несовершеннолетнего требует доверенности",
	};
}

export type PatientCardTab = "general" | "anamnesis" | "visits" | "family";

export interface PatientCardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: PatientGeneralInfo | null | undefined;
	readonly patientData?: PatientGeneralInfo | null | undefined;
	readonly initialSafetyProfile?: Partial<PatientClinicalSafetyProfile> | null | undefined;
	readonly safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	readonly onSavePatient?: ((patient: PatientGeneralInfo, safetyProfile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
}

/**
 * PatientCardModal — Комплексная медицинская и паспортная карта пациента (Форма 043/у / Регистратура / Врач).
 *
 * МАНДАТЫ КЛИНИЧЕСКОЙ АВТОНОМИИ И ЭРГОНОМИКИ:
 * 1. Мандат 8e п. 3: 1-клик заполнение физиологической нормой («Соматически здоров / Физиологическая норма»).
 * 2. Мандат 8e п. 4: Врач свободно правит свои записи в 1 клик. Запрещены блокировки без возможности редактирования.
 * 3. Мандат 8e п. 5: Печать доступна в любой момент со штампом «ЧЕРНОВИК» или «ПОДПИСАНО ВРАЧОМ».
 * 4. Мандат 8d п. 7: СТРОГО 0 эмодзи — исключительно векторные иконки Lucide.
 * 5. Вкладки: «Основные и паспортные данные», «Медицинский статус и соматика», «История визитов и финансы», «Семья и представители».
 * 6. WCAG AAA темная тема (data-theme="dark").
 */
export const PatientCardModal: React.FC<PatientCardModalProps> = React.memo(
	function PatientCardModal({
		isOpen,
		onClose,
		patient: initialPatient,
		patientData: initialPatientDataAlias,
		initialSafetyProfile,
		safetyProfile: initialSafetyProfileAlias,
		onSavePatient,
		onApplySomaticNorm,
		disabled = false,
		onNavigateToVisit,
		onNewAppointment,
	}) {
		const isDemo = isDemoShowcaseMode();
		const effectiveInitialPatient =
			initialPatient ??
			initialPatientDataAlias ??
			(isDemo ? DEMO_SHOWCASE_MODAL_PATIENT : {});
		const effectiveInitialSafety =
			initialSafetyProfile ??
			initialSafetyProfileAlias ??
			(isDemo ? DEMO_SHOWCASE_MODAL_SAFETY : undefined);

		const [activeTab, setActiveTab] = useState<PatientCardTab>("general");
		const [patientData, setPatientData] = useState<PatientGeneralInfo>(() => effectiveInitialPatient);
		const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(() => {
			return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...effectiveInitialSafety };
		});
		const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState(false);

		const isChildPatient = React.useMemo(() => {
			if (patientData.birthDate) {
				const birthYear = new Date(patientData.birthDate).getFullYear();
				const currentYear = new Date().getFullYear();
				if (!Number.isNaN(birthYear) && currentYear - birthYear < 18) return true;
			}
			return !!patientData.representativeType;
		}, [patientData.birthDate, patientData.representativeType]);

		useEffect(() => {
			if (initialPatient || initialPatientDataAlias) {
				setPatientData((prev) => ({ ...prev, ...(initialPatient ?? initialPatientDataAlias) }));
			}
		}, [initialPatient, initialPatientDataAlias]);

		useEffect(() => {
			if (effectiveInitialSafety) {
				setSafetyProfile((prev) => ({ ...prev, ...effectiveInitialSafety }));
			}
		}, [effectiveInitialSafety]);

		const safetyEvaluation = React.useMemo(() => {
			return evaluatePatientSafetyFlags(safetyProfile);
		}, [safetyProfile]);

		const handleUpdatePatientField = useCallback((field: keyof PatientGeneralInfo, value: any) => {
			setPatientData((prev) => ({
				...prev,
				[field]: value,
			}));
		}, []);

		const handleApplyNorm = useCallback(() => {
			const clean = createHealthySomaticNormProfile();
			setSafetyProfile(clean);
			if (onApplySomaticNorm) {
				onApplySomaticNorm();
			}
			showToast("Применена физиологическая норма: соматически здоров (1 клик)", "success", 4000);
		}, [onApplySomaticNorm]);

		const handlePrint = useCallback(() => {
			if (typeof window !== "undefined") {
				window.print();
			}
		}, []);

		const handleSave = useCallback(() => {
			if (onSavePatient) {
				onSavePatient(patientData, safetyProfile);
			}
			showToast("Данные пациента сохранены", "success", 3000);
			onClose();
		}, [patientData, safetyProfile, onSavePatient, onClose]);

		if (!isOpen) return null;

		const modalContent = (
			<div
				className="anamnesis-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs print:p-0 print:bg-white print:static"
				role="dialog"
				aria-modal="true"
				aria-labelledby="patient-card-modal-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				<div
					className="patient-card-modal bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink)] print:border-none print:shadow-none print:max-h-none print:rounded-none"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Modal Header */}
					<div className="flex items-center justify-between px-3.5 py-2.5 sm:p-4 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] gap-2 min-w-0 print:hidden">
						<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
							<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shrink-0">
								<User className="w-4 h-4 sm:w-5 sm:h-5" />
							</div>
							<div className="min-w-0 flex-1">
								<h2
									id="patient-card-modal-title"
									className="text-sm sm:text-base font-black text-[var(--ink)] m-0 truncate"
								>
									{patientData.fullName || "Медицинская карта пациента"}
								</h2>
								<p className="text-xs text-[var(--muted)] m-0 truncate">
									{patientData.phone ? `Тел: ${patientData.phone}` : "Паспортная карточка и клинический статус"}
									{patientData.birthDate ? ` • ${patientData.birthDate}` : ""}
									{patientData.id ? ` • ID: ${patientData.id.slice(0, 8)}` : ""}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
							{isChildPatient && (
								<button
									type="button"
									data-testid="btn-patient-card-diploma"
									onClick={() => setIsDiplomaModalOpen(true)}
									className="border border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none transition-all shadow-2xs"
									title="Распечатать «Диплом за храбрость» маленькому пациенту"
								>
									<Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
									<span className="hidden sm:inline">Диплом за храбрость</span>
									<span className="sm:hidden">Диплом</span>
								</button>
							)}

							<button
								type="button"
								data-testid="btn-print-patient-card"
								onClick={handlePrint}
								className="border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--glass-hover,var(--paper-soft))] min-h-[44px] sm:min-h-[32px] h-8 px-3.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none transition-all shadow-2xs"
								title="Печать карты пациента"
							>
								<Printer className="w-4 h-4 shrink-0" />
								<span>Печать</span>
							</button>

							<button
								type="button"
								data-testid="btn-close-patient-card-modal"
								onClick={onClose}
								className="border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-hover,var(--paper-soft))] min-h-[44px] sm:min-h-[32px] h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
								aria-label="Закрыть окно"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Prominent Somatic Safety Alert Banner (Mandates 8e & 8k, Task 3) */}
					{safetyEvaluation.activeFlags.length > 0 && (
						<div
							className={`px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2.5 border-b shrink-0 flex-wrap sm:flex-nowrap print:hidden ${
								safetyEvaluation.hasCriticalStopFlags
									? "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-100"
									: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100"
							}`}
							role="alert"
							data-testid="patient-card-modal-somatic-banner"
						>
							<div className="flex items-center gap-2 min-w-0 flex-1">
								<AlertOctagon
									className={`w-4 h-4 shrink-0 ${
										safetyEvaluation.hasCriticalStopFlags
											? "text-rose-600 dark:text-rose-400 animate-pulse"
											: "text-amber-600 dark:text-amber-400"
									}`}
								/>
								<div className="flex items-center gap-1.5 flex-wrap min-w-0">
									<span className="text-[10px] font-black uppercase tracking-wider shrink-0">
										{safetyEvaluation.hasCriticalStopFlags
											? "КРИТИЧЕСКИЙ СТОП-ФАКТОР:"
											: "КЛИНИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ:"}
									</span>
									<div className="flex items-center gap-1.5 flex-wrap">
										{safetyEvaluation.activeFlags.map((flag) => (
											<span
												key={flag.id}
												className={`px-1.5 py-0.2 rounded-md text-[11px] font-extrabold border ${
													flag.severity === "critical"
														? "bg-rose-600 text-white border-rose-700"
														: "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40"
												}`}
												title={flag.description}
											>
												{flag.shortBadge || flag.titleRu}
											</span>
										))}
									</div>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setActiveTab("anamnesis")}
								className="text-xs font-bold underline hover:opacity-80 cursor-pointer shrink-0 transition-opacity"
							>
								Открыть статус
							</button>
						</div>
					)}

					{/* Navigation Tabs Bar */}
					<div className="flex items-center justify-between px-3.5 sm:px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] flex-nowrap overflow-x-auto gap-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth print:hidden">
						<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
							{/* Вкладка 1: Основные и паспортные */}
							<button
								type="button"
								data-testid="tab-patient-general"
								className={`min-h-[44px] sm:min-h-[32px] h-8 px-3.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
									activeTab === "general"
										? "border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,white)] shadow-xs"
										: "border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shadow-2xs"
								}`}
								onClick={() => setActiveTab("general")}
							>
								<FileText className="w-3.5 h-3.5 shrink-0" />
								<span>Основные и паспортные</span>
							</button>

							{/* Вкладка 2: Медицинский статус и соматика */}
							<button
								type="button"
								data-testid="tab-patient-anamnesis"
								className={`min-h-[44px] sm:min-h-[32px] h-8 px-3.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
									activeTab === "anamnesis"
										? "border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,white)] shadow-xs"
										: "border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shadow-2xs"
								}`}
								onClick={() => setActiveTab("anamnesis")}
							>
								<HeartPulse className="w-3.5 h-3.5 shrink-0" />
								<span>Медицинский статус и соматика</span>
							</button>

							{/* Вкладка 3: История визитов и финансы */}
							<button
								type="button"
								data-testid="tab-patient-visits"
								className={`min-h-[44px] sm:min-h-[32px] h-8 px-3.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
									activeTab === "visits"
										? "border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,white)] shadow-xs"
										: "border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shadow-2xs"
								}`}
								onClick={() => setActiveTab("visits")}
							>
								<History className="w-3.5 h-3.5 shrink-0" />
								<span>История визитов и финансы</span>
							</button>

							{/* Вкладка 4: Семья и представители */}
							<button
								type="button"
								data-testid="tab-patient-family"
								className={`min-h-[44px] sm:min-h-[32px] h-8 px-3.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
									activeTab === "family"
										? "border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,white)] shadow-xs"
										: "border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shadow-2xs"
								}`}
								onClick={() => setActiveTab("family")}
							>
								<Users className="w-3.5 h-3.5 shrink-0" />
								<span>Семья и представители</span>
							</button>
						</div>

						{/* 1-Click Norm Fast Action in Header Toolbar (Мандат 8e п. 3, Мандат 8p §206) */}
						<button
							type="button"
							data-testid="btn-somatic-healthy-norm"
							className="min-h-[44px] sm:min-h-[32px] h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 shrink-0 whitespace-nowrap select-none"
							onClick={handleApplyNorm}
							title="Зафиксировать физиологическую норму: соматически здоров"
						>
							<ShieldCheck className="w-4 h-4 shrink-0" />
							<span className="shrink-0 whitespace-nowrap">Норма</span>
						</button>
					</div>

					{/* Modal Body */}
					<div className="p-3 sm:p-5 overflow-y-auto flex-1">
						<PatientGeneralInfoTab
							patient={patientData}
							safetyProfile={safetyProfile}
							onUpdatePatient={handleUpdatePatientField}
							onUpdateSafetyProfile={setSafetyProfile}
							onApplySomaticNorm={handleApplyNorm}
							disabled={disabled}
							activeSection={activeTab === "anamnesis" ? "somatic" : activeTab}
							onNavigateToVisit={onNavigateToVisit}
							onNewAppointment={onNewAppointment}
						/>
					</div>

					{/* Modal Footer */}
					<div className="flex items-center justify-between p-3 sm:p-4 border-t border-[var(--glass-border)] bg-[var(--paper-strong)] flex-wrap gap-2 print:hidden">
						<span className="text-xs text-[var(--muted)] truncate">
							Медицинская карта пациента • Защита персональных данных
						</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onClose}
								className="border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--glass-hover,var(--paper-soft))] min-h-[44px] sm:min-h-[32px] h-8 px-4 text-xs font-semibold rounded-lg cursor-pointer select-none transition-all shadow-2xs"
							>
								Закрыть
							</button>
							<button
								type="button"
								data-testid="btn-save-patient-card"
								onClick={handleSave}
								className="bg-[var(--teal)] text-white hover:opacity-95 min-h-[44px] sm:min-h-[32px] h-8 px-4 text-xs font-semibold rounded-lg shadow-xs cursor-pointer select-none transition-all"
							>
								Сохранить
							</button>
						</div>
					</div>
					{/* 1-Тап Печать диплома за храбрость для ребенка */}
					{isDiplomaModalOpen && (
						<PediatricBraveryDiplomaModal
							isOpen={isDiplomaModalOpen}
							onClose={() => setIsDiplomaModalOpen(false)}
							patientName={patientData.fullName || undefined}
							doctorName="Врач-стоматолог детский"
						/>
					)}
				</div>
			</div>
		);

		return typeof document !== "undefined" && document.body
			? createPortal(modalContent, document.body)
			: modalContent;
	},
);

export default PatientCardModal;
