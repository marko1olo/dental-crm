import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	CheckCircle2,
	FileText,
	HeartPulse,
	Printer,
	ShieldCheck,
	User,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	formatSafetyProfileToDiaryText,
} from "./safetyMath";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
} from "./PatientDetailModal";
import {
	PatientGeneralInfoTab,
	type PatientGeneralInfo,
} from "./tabs/PatientGeneralInfoTab";
import { SomaticAnamnesisCard } from "../clinical/SomaticAnamnesisCard";
import {
	STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
} from "@dental/shared";

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
			? "Законный представитель: имеет законное право подписывать ИДС за несовершеннолетнего (ст. 20 323-ФЗ и ст. 64 СК РФ)"
			: "Член семьи: подписание ИДС за несовершеннолетнего требует нотариальной доверенности (ст. 20 323-ФЗ)",
	};
}

export interface PatientCardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: PatientGeneralInfo | null | undefined;
	readonly initialSafetyProfile?: Partial<PatientClinicalSafetyProfile> | null | undefined;
	readonly onSavePatient?: ((patient: PatientGeneralInfo, safetyProfile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

/**
 * PatientCardModal — Модальное окно амбулаторной карты пациента (Форма 043/у / Регистратура).
 *
 * МАНДАТЫ КЛИНИЧЕСКОЙ АВТОНОМИИ И ЭРГОНОМИКИ (THE HAMMER / AGENTS.md):
 * 1. Мандат 8e п. 3: 1-клик заполнение физиологической нормой («Соматически здоров / Физиологическая норма»).
 * 2. Мандат 8e п. 4: Врач свободно правит свои записи в 1 клик. Запрещены блокировки без возможности редактирования.
 * 3. Мандат 8e п. 5: Печать доступна в любой момент со штампом «ЧЕРНОВИК» или «ПОДПИСАНО ВРАЧОМ».
 * 4. Мандат 8d п. 7: СТРОГО 0 эмодзи — исключительно векторные иконки Lucide.
 * 5. WCAG AAA темная тема (data-theme="dark").
 */
export const PatientCardModal: React.FC<PatientCardModalProps> = React.memo(
	function PatientCardModal({
		isOpen,
		onClose,
		patient: initialPatient,
		initialSafetyProfile,
		onSavePatient,
		onApplySomaticNorm,
		disabled = false,
	}) {
		const [activeTab, setActiveTab] = useState<"general" | "anamnesis">("general");
		const [patientData, setPatientData] = useState<PatientGeneralInfo>(() => initialPatient ?? {});
		const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(() => {
			return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...initialSafetyProfile };
		});

		useEffect(() => {
			if (initialPatient) {
				setPatientData((prev) => ({ ...prev, ...initialPatient }));
			}
		}, [initialPatient]);

		useEffect(() => {
			if (initialSafetyProfile) {
				setSafetyProfile((prev) => ({ ...prev, ...initialSafetyProfile }));
			}
		}, [initialSafetyProfile]);

		const handleUpdatePatientField = useCallback((field: keyof PatientGeneralInfo, value: string) => {
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
		if (typeof document === "undefined") return null;

		return createPortal(
			<div
				className="anamnesis-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
				role="dialog"
				aria-modal="true"
				aria-labelledby="patient-card-modal-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				<div
					className="patient-card-modal bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Modal Header */}
					<div className="flex items-center justify-between p-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 flex-wrap gap-2">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-[var(--brand-primary,#0d9488)] text-white flex items-center justify-center shrink-0">
								<User className="w-5 h-5" />
							</div>
							<div>
								<h2
									id="patient-card-modal-title"
									className="text-base font-black text-[var(--ink,#1e293b)] dark:text-white m-0"
								>
									{patientData.fullName || "Медицинская карта пациента"}
								</h2>
								<p className="text-xs text-[var(--muted,#64748b)] m-0">
									{patientData.phone ? `Тел: ${patientData.phone}` : "Общие сведения и соматический статус"}
									{patientData.id ? ` • ID: ${patientData.id.slice(0, 8)}` : ""}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								data-testid="btn-print-patient-card"
								onClick={handlePrint}
								className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700 text-[var(--ink,#1e293b)] dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
								title="Печать карты пациента"
							>
								<Printer className="w-4 h-4" />
								<span>Печать</span>
							</button>

							<button
								type="button"
								data-testid="btn-close-patient-card-modal"
								onClick={onClose}
								className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)] dark:hover:text-white cursor-pointer"
								aria-label="Закрыть окно"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>

					{/* Navigation Tabs */}
					<div className="flex items-center justify-between px-4 py-2 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,rgba(0,0,0,0.02))] dark:bg-slate-950/40 flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<button
								type="button"
								data-testid="tab-patient-general"
								className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
									activeTab === "general"
										? "bg-[var(--brand-primary,#0d9488)] text-white shadow-xs"
										: "bg-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)] dark:hover:text-white"
								}`}
								onClick={() => setActiveTab("general")}
							>
								<FileText className="w-3.5 h-3.5" />
								<span>Общие сведения</span>
							</button>

							<button
								type="button"
								data-testid="tab-patient-anamnesis"
								className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
									activeTab === "anamnesis"
										? "bg-[var(--brand-primary,#0d9488)] text-white shadow-xs"
										: "bg-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)] dark:hover:text-white"
								}`}
								onClick={() => setActiveTab("anamnesis")}
							>
								<HeartPulse className="w-3.5 h-3.5" />
								<span>Анкета здоровья</span>
							</button>
						</div>

						{/* 1-Click Norm Fast Action in Header Toolbar */}
						<button
							type="button"
							data-testid="btn-somatic-healthy-norm"
							className="min-h-[40px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
							onClick={handleApplyNorm}
							title="1-клик: Применить физиологическую норму (соматически здоров)"
						>
							<ShieldCheck className="w-4 h-4 shrink-0" />
							<span>Соматически здоров / норма (1-клик)</span>
						</button>
					</div>

					{/* Modal Body */}
					<div className="p-4 overflow-y-auto flex-1">
						{activeTab === "general" ? (
							<PatientGeneralInfoTab
								patient={patientData}
								safetyProfile={safetyProfile}
								onUpdatePatient={handleUpdatePatientField}
								onUpdateSafetyProfile={setSafetyProfile}
								onApplySomaticNorm={handleApplyNorm}
								disabled={disabled}
							/>
						) : (
							<div className="flex flex-col gap-4">
								<div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 rounded-xl text-xs text-teal-900 dark:text-teal-200">
									Детальный клинический опросник и соматический статус. Врач фиксирует выявленную патологию.
								</div>
								<SomaticAnamnesisCard
									initialProfile={safetyProfile}
									patientId={patientData?.id || undefined}
									patientName={patientData?.fullName || undefined}
									onApplyNorm={(normProfile) => {
										setSafetyProfile(normProfile);
										handleApplyNorm();
									}}
									onSave={(updatedProfile) => {
										setSafetyProfile(updatedProfile);
										showToast("Соматический анамнез сохранен", "success", 3000);
									}}
								/>
							</div>
						)}
					</div>

					{/* Modal Footer */}
					<div className="flex items-center justify-between p-4 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,rgba(0,0,0,0.02))] dark:bg-slate-950/40 flex-wrap gap-2">
						<span className="text-xs text-[var(--muted,#64748b)]">
							Автосохранение данных пациента активно • Форма 043/у
						</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onClose}
								className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#1e293b)] dark:text-slate-100 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700 cursor-pointer"
							>
								Закрыть
							</button>
							<button
								type="button"
								data-testid="btn-save-patient-card"
								onClick={handleSave}
								className="min-h-[44px] px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand-primary,#0d9488)] hover:bg-teal-700 text-white shadow-sm cursor-pointer"
							>
								Сохранить
							</button>
						</div>
					</div>
				</div>
			</div>,
			document.body,
		);
	},
);

export default PatientCardModal;
