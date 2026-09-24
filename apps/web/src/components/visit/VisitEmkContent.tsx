/**
 * apps/web/src/components/visit/VisitEmkContent.tsx
 *
 * Chairside Outpatient EMK Content with Integrated Allergo-Somatic Alert Shield,
 * 1-Click Emergency Protocol Bridge, and Complete Doctor Autonomy.
 *
 * CONSTITUTIONAL MANDATES:
 * - Mandate 8e: Doctor Autonomy (0 disabled buttons due to somatic/secondary fields,
 *   1-click physiological norm by default, doctor edits pathology only).
 * - Mandate 8i: Ambulatory Dental Context (Strictly chairside dental safety: allergies,
 *   pacemaker -> ultrasound ban, pregnancy, asthma, epilepsy; zero hospital bloat).
 * - Mandate 8k: Friction-Killer Law (CRM != Reality Simulator, 1-click presets and batch actions).
 * - Mandate 8d item 7: Sanctity of Medical Records (Zero cartoon emojis, strictly professional clinical typography).
 */

import React, { useState, useCallback } from "react";
import {
	AlertOctagon,
	Check,
	CheckCircle2,
	FileText,
	HeartPulse,
	Printer,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { PatientSomaticAlertBanner } from "../patient/PatientSomaticAlertBanner";
import { EmergencyRescueModal } from "../emergency/EmergencyRescueModal";
import {
	type SomaticProfileInput,
	CANONICAL_FORM043_SOMATIC_NORM,
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	CANONICAL_SOMATIC_NORM_SHORT,
} from "../../utils/somaticNorm";
import { showToast } from "../GlobalToast";

export interface VisitEmkFormValues {
	complaint: string;
	anamnesis: string;
	objectiveStatus: string;
	diagnosis: string;
	treatmentPlan: string;
}

export interface VisitEmkContentProps {
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly patientGender?: "male" | "female" | undefined;
	readonly somaticProfile?: SomaticProfileInput | null | undefined;
	readonly allergyText?: string | null | undefined;
	readonly initialFormValues?: Partial<VisitEmkFormValues> | undefined;
	readonly isSignedVisit?: boolean | undefined;
	readonly onSave?: ((values: VisitEmkFormValues) => void) | undefined;
	readonly onComplete?: ((values: VisitEmkFormValues) => void) | undefined;
	readonly onPrint?: (() => void) | undefined;
}

export function VisitEmkContent({
	patientName = "Пациент",
	patientAgeYears = 42,
	patientWeightKg = 75,
	patientGender = "male",
	somaticProfile = null,
	allergyText = null,
	initialFormValues,
	isSignedVisit = false,
	onSave,
	onComplete,
	onPrint,
}: VisitEmkContentProps) {
	const [formValues, setFormValues] = useState<VisitEmkFormValues>({
		complaint: initialFormValues?.complaint ?? "",
		anamnesis: initialFormValues?.anamnesis ?? "",
		objectiveStatus: initialFormValues?.objectiveStatus ?? "",
		diagnosis: initialFormValues?.diagnosis ?? "",
		treatmentPlan: initialFormValues?.treatmentPlan ?? "",
	});

	const [isEmergencyModalOpen, setIsEmergencyModalOpen] =
		useState<boolean>(false);
	const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);

	const updateField = (field: keyof VisitEmkFormValues, value: string) => {
		setFormValues((prev) => ({ ...prev, [field]: value }));
		setIsSavedSuccess(false);
	};

	// 1-Click Physiological Norm application (Mandates 8e, 8k)
	const handleApplySomaticNorm = useCallback(() => {
		setFormValues((prev) => ({
			complaint: prev.complaint.trim()
				? prev.complaint
				: "Жалоб на момент осмотра не предъявляет.",
			anamnesis: prev.anamnesis.trim()
				? (prev.anamnesis.includes("Соматически здоров")
					? prev.anamnesis
					: `${CANONICAL_SOMATIC_HEALTHY_NORM_TEXT}\n${prev.anamnesis}`)
				: CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
			objectiveStatus: prev.objectiveStatus.trim()
				? prev.objectiveStatus
				: "Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена. Прикус ортогнатический. Зубные ряды интактны.",
			diagnosis: prev.diagnosis.trim()
				? prev.diagnosis
				: "Z01.2 Стоматологическое обследование (патологий не выявлено)",
			treatmentPlan: prev.treatmentPlan.trim()
				? prev.treatmentPlan
				: "Проведен плановый профилактический осмотр полости рта, онкоскрининг, индексная оценка гигиены. Рекомендована плановая профгигиена через 6 месяцев.",
		}));
		showToast("Физиологическая норма (1-клик) внесена в дневник 043/у", "success");
	}, []);

	// Bridge for inserting emergency resuscitation protocol directly into Form 043/u
	const handleApplyEmergencyProtocolToDiary = useCallback(
		(actText: string) => {
			setFormValues((prev) => {
				const separator = prev.treatmentPlan.trim() ? "\n\n" : "";
				return {
					...prev,
					treatmentPlan: `${prev.treatmentPlan}${separator}--- ПРОТОКОЛ ОКАЗАНИЯ НЕОТЛОЖНОЙ ПОМОЩИ (ПРИКАЗ МЗ РФ № 786н / 1144н) ---\n${actText}`,
				};
			});
			showToast("Протокол неотложной помощи внесен в дневник визита 043/у", "success");
		},
		[],
	);

	const handleSaveVisit = () => {
		// Doctor autonomy: never disabled, auto-fills standard norm if totally empty
		const effectiveValues: VisitEmkFormValues = {
			complaint: formValues.complaint.trim() || "Жалоб не предъявляет",
			anamnesis:
				formValues.anamnesis.trim() || CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
			objectiveStatus:
				formValues.objectiveStatus.trim() ||
				"Слизистая оболочка бледно-розовая, влажная. Патологий не выявлено.",
			diagnosis:
				formValues.diagnosis.trim() ||
				"Z01.2 Стоматологическое обследование (Норма)",
			treatmentPlan:
				formValues.treatmentPlan.trim() ||
				"Осмотр проведен, патологий не выявлено. Санация не требуется.",
		};

		if (onSave) {
			onSave(effectiveValues);
		}
		setIsSavedSuccess(true);
		showToast("Дневник приёма Формы 043/у сохранён", "success");
	};

	const handleCompleteVisit = () => {
		const effectiveValues: VisitEmkFormValues = {
			complaint: formValues.complaint.trim() || "Жалоб не предъявляет",
			anamnesis:
				formValues.anamnesis.trim() || CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
			objectiveStatus:
				formValues.objectiveStatus.trim() ||
				"Слизистая оболочка бледно-розовая, влажная.",
			diagnosis:
				formValues.diagnosis.trim() ||
				"Z01.2 Стоматологическое обследование",
			treatmentPlan:
				formValues.treatmentPlan.trim() ||
				"Осмотр проведен, патологий не выявлено.",
		};

		if (onComplete) {
			onComplete(effectiveValues);
		}
		showToast("Приём завершён. Дневник 043/у зафиксирован.", "success");
	};

	return (
		<section
			data-testid="visit-emk-content"
			className="visit-emk-content bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl p-3 sm:p-4 space-y-4"
			aria-label="Электронная медицинская карта стоматологического приёма"
		>
			{/* 1. Chairside Allergo-Somatic Alert Shield Header */}
			<header className="visit-emk-header space-y-2">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<FileText className="w-5 h-5 text-[var(--primary,#0ea5e9)] shrink-0" />
						<h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--ink)] m-0">
							Дневник амбулаторного приёма (Форма 043/у)
						</h2>
					</div>

					<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
						<button
							type="button"
							data-testid="btn-fill-norm-quick"
							onClick={handleApplySomaticNorm}
							className="secondary-button h-8 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
							title="Заполнить дневник физиологической нормой по умолчанию в 1 клик (Мандат 8e)"
						>
							<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
							<span>Заполнить нормой в 1 клик</span>
						</button>

						<button
							type="button"
							data-testid="btn-print-visit-043u"
							onClick={onPrint || (() => window.print())}
							className="secondary-button h-8 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 border border-sky-500/40 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
							title="Распечатать карту 043/у"
						>
							<Printer size={14} />
							<span>Печать 043/у</span>
						</button>
					</div>
				</div>

				{/* High-Contrast Somatic Guard Banner */}
				<PatientSomaticAlertBanner
					patientName={patientName}
					patientAgeYears={patientAgeYears}
					patientWeightKg={patientWeightKg}
					patientGender={patientGender}
					somaticProfile={somaticProfile}
					allergyText={allergyText}
					onApplySomaticNorm={handleApplySomaticNorm}
					onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
					onApplyToDiary={handleApplyEmergencyProtocolToDiary}
				/>
			</header>

			{/* 2. Structured Clinical Fields (Form 043/u SOAP) */}
			<div className="visit-emk-fields grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
				{/* Complaints (Жалобы) */}
				<div className="space-y-1">
					<label
						htmlFor="emk-complaint-field"
						className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
					>
						Жалобы (Subjective)
					</label>
					<textarea
						id="emk-complaint-field"
						data-testid="input-emk-complaint"
						rows={2}
						className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--primary,#0ea5e9)] transition-all resize-y"
						placeholder="Жалоб на момент осмотра не предъявляет..."
						value={formValues.complaint}
						onChange={(e) => updateField("complaint", e.target.value)}
					/>
				</div>

				{/* Anamnesis (Анамнез жизни и заболевания) */}
				<div className="space-y-1">
					<label
						htmlFor="emk-anamnesis-field"
						className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
					>
						Анамнез (Anamnesis)
					</label>
					<textarea
						id="emk-anamnesis-field"
						data-testid="input-emk-anamnesis"
						rows={2}
						className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--primary,#0ea5e9)] transition-all resize-y"
						placeholder="Соматически здоров. Аллергоанамнез не отягощен..."
						value={formValues.anamnesis}
						onChange={(e) => updateField("anamnesis", e.target.value)}
					/>
				</div>

				{/* Objective Status (Объективный статус) */}
				<div className="space-y-1">
					<label
						htmlFor="emk-objective-field"
						className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
					>
						Объективный статус (Objective)
					</label>
					<textarea
						id="emk-objective-field"
						data-testid="input-emk-objective"
						rows={2}
						className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--primary,#0ea5e9)] transition-all resize-y"
						placeholder="Слизистая оболочка полости рта бледно-розовая, влажная..."
						value={formValues.objectiveStatus}
						onChange={(e) => updateField("objectiveStatus", e.target.value)}
					/>
				</div>

				{/* Diagnosis (Диагноз МКБ-10) */}
				<div className="space-y-1">
					<label
						htmlFor="emk-diagnosis-field"
						className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
					>
						Диагноз МКБ-10 (Assessment)
					</label>
					<textarea
						id="emk-diagnosis-field"
						data-testid="input-emk-diagnosis"
						rows={2}
						className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--primary,#0ea5e9)] transition-all resize-y"
						placeholder="Z01.2 Стоматологическое обследование / K02.1 Кариес дентина..."
						value={formValues.diagnosis}
						onChange={(e) => updateField("diagnosis", e.target.value)}
					/>
				</div>

				{/* Treatment Plan & Clinical Protocol (План лечения и протокол) */}
				<div className="space-y-1 md:col-span-2">
					<label
						htmlFor="emk-treatment-field"
						className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
					>
						Протокол манипуляций и назначения (Plan)
					</label>
					<textarea
						id="emk-treatment-field"
						data-testid="input-emk-treatment-plan"
						rows={3}
						className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--primary,#0ea5e9)] transition-all resize-y"
						placeholder="Инфильтрационная анестезия, препарирование, пломбирование..."
						value={formValues.treatmentPlan}
						onChange={(e) => updateField("treatmentPlan", e.target.value)}
					/>
				</div>
			</div>

			{/* 3. Doctor Action Footer: Autonomy Guaranteed (Zero disabled buttons per Mandate 8e) */}
			<footer className="visit-emk-footer pt-3 border-t border-[var(--line)] flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2">
					{isSavedSuccess && (
						<span
							data-testid="emk-saved-indicator"
							className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md"
						>
							<CheckCircle2 size={13} />
							<span>Запись сохранена</span>
						</span>
					)}
					<span className="text-[11px] text-[var(--muted)]">
						{isSignedVisit ? "Подписано врачом" : "Черновик визита активен"}
					</span>
				</div>

				<div className="flex items-center gap-2 shrink-0 flex-wrap">
					{/* Сохранить запись приёма: НИКОГДА не заблокирована из-за соматики (Мандат 8e) */}
					<button
						type="button"
						data-testid="btn-save-visit-note"
						onClick={handleSaveVisit}
						className="primary-button h-9 px-4 text-xs sm:text-sm font-extrabold rounded-xl bg-[var(--teal-fill,var(--teal,#0d9488))] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
						title="Сохранить запись приёма (Форма 043/у)"
					>
						<Check size={16} className="stroke-[3]" />
						<span>Сохранить запись приёма</span>
					</button>

					{/* Завершить приём: НИКОГДА не заблокирована из-за соматики (Мандат 8e) */}
					<button
						type="button"
						data-testid="btn-complete-visit-emk"
						onClick={handleCompleteVisit}
						className="primary-button h-9 px-4 text-xs sm:text-sm font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
						title="Завершить приём и зафиксировать медицинские данные"
					>
						<Check size={16} className="stroke-[3]" />
						<span>Завершить приём</span>
					</button>
				</div>
			</footer>

			{/* Emergency Rescue HUD Modal */}
			<EmergencyRescueModal
				isOpen={isEmergencyModalOpen}
				onClose={() => setIsEmergencyModalOpen(false)}
				onApplyToDiary={handleApplyEmergencyProtocolToDiary}
				initialPatientName={patientName}
				initialPatientAgeYears={patientAgeYears}
				initialPatientWeightKg={patientWeightKg}
				initialPatientGender={patientGender}
				defaultScenarioId="anaphylactic_shock"
			/>
		</section>
	);
}
