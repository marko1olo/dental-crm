/**
 * SomaticAnamnesisCard.tsx — Карточка соматического статуса и факторов риска в амбулаторной стоматологии.
 *
 * СООТВЕТСТВИЕ КОНСТИТУЦИИ И МАНДАТАМ:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Ликвидация академического блоата и процедурных симуляторов (Мандаты 8e, 8i, 8k):
 *   1-клик заполнение физиологической нормой по умолчанию («Соматически здоров / без отягощенного анамнеза»)
 *   кнопкой `mark-somatic-norm-btn` (data-testid="mark-somatic-norm-btn").
 *   Врач правит ТОЛЬКО реальную патологию амбулаторного стоматологического кресла (аллергия на анестетики/антибиотики,
 *   гипертония, сахарный диабет, антикоагулянты, бисфосфонаты, беременность, ЭКС). Никаких 50 пунктов стационарных опросников!
 * - Автономия врача (Мандат 8e):
 *   0 заблокированных (disabled) кнопок без причины. Сохранение и перенос в дневник доступны всегда.
 * - Святость официальных документов (Мандат 8d п. 7):
 *   Ноль мультяшных эмодзи в медицинских записях и протоколах (строго векторные иконки Lucide).
 */

import {
	Activity,
	AlertTriangle,
	Check,
	CheckCircle2,
	FileText,
	HeartPulse,
	Pill,
	RotateCcw,
	Save,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	isSomaticProfilePhysiologicalNorm,
	parseSafetyProfileFromText,
} from "../patients/safetyMath";

export interface SomaticAnamnesisCardProps {
	readonly initialProfile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly onSave?: ((profile: PatientClinicalSafetyProfile, diarySnippet: string) => void) | undefined;
	readonly onSyncToDiary?: ((diarySnippet: string) => void) | undefined;
	readonly onApplyNorm?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly className?: string | undefined;
	readonly isCompact?: boolean | undefined;
}

export const SomaticAnamnesisCard: React.FC<SomaticAnamnesisCardProps> = ({
	initialProfile,
	patientId,
	patientName,
	onSave,
	onSyncToDiary,
	onApplyNorm,
	className = "",
	isCompact = false,
}) => {
	const customNotesId = useId();
	const anticoagulantInputId = useId();
	const bisphosphonateInputId = useId();

	// Initialize safety profile
	const [profile, setProfile] = useState<PatientClinicalSafetyProfile>(() => {
		if (!initialProfile) return DEFAULT_SOMATIC_HEALTHY_NORM;
		if (typeof initialProfile === "string") {
			return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...parseSafetyProfileFromText(initialProfile) };
		}
		return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...initialProfile };
	});

	// Evaluate safety risks using clinical safety engine
	const evaluation = useMemo(() => evaluatePatientSafetyFlags(profile), [profile]);
	const isNorm = useMemo(() => isSomaticProfilePhysiologicalNorm(profile), [profile]);
	const diaryText = useMemo(() => formatSafetyProfileToDiaryText(profile), [profile]);

	// 1-Click Physiological Norm Handler (Mandates 8e, 8k)
	const handleApplyPhysiologicalNorm = useCallback(() => {
		const normProfile = createHealthySomaticNormProfile();
		const updatedProfile: PatientClinicalSafetyProfile = {
			...normProfile,
			customChronicNotes:
				"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.",
		};
		setProfile(updatedProfile);
		if (onApplyNorm) {
			onApplyNorm(updatedProfile);
		}
		if (onSave) {
			onSave(updatedProfile, formatSafetyProfileToDiaryText(updatedProfile));
		}
		showToast(
			"Применена физиологическая норма: соматически здоров (1 клик)",
			"success",
			3000,
		);
	}, [onApplyNorm, onSave]);

	// Debounced autosave (Mandate 8e: protection against data loss without modal prompts)
	const isMountedRef = useRef(false);
	useEffect(() => {
		if (!isMountedRef.current) {
			isMountedRef.current = true;
			return;
		}
		if (!onSave) return;
		const timer = setTimeout(() => {
			onSave(profile, diaryText);
		}, 800);
		return () => clearTimeout(timer);
	}, [profile, diaryText, onSave]);

	// Toggle helper for boolean pathology flags
	const toggleFlag = useCallback((key: keyof PatientClinicalSafetyProfile) => {
		setProfile((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	}, []);

	// Save handler
	const handleSave = useCallback(() => {
		if (onSave) {
			onSave(profile, diaryText);
		}
		showToast("Соматический статус пациента сохранен", "success", 2500);
	}, [profile, diaryText, onSave]);

	// Sync to diary handler
	const handleSyncToDiary = useCallback(() => {
		if (onSyncToDiary) {
			onSyncToDiary(diaryText);
		}
		navigator.clipboard?.writeText?.(diaryText).catch(() => {});
		showToast("Запись перенесена в дневник 043/у", "success", 3000);
	}, [diaryText, onSyncToDiary]);

	return (
		<div
			className={`somatic-anamnesis-card flex flex-col gap-4 w-full p-4 sm:p-5 rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 shadow-sm ${className}`}
			data-testid="somatic-anamnesis-card"
			data-patient-id={patientId ?? undefined}
		>
			{/* Top Bar: Title & 1-Click Norm Button */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 pb-3">
				<div className="flex items-center gap-2.5">
					<div
						className={`flex items-center justify-center w-8 h-8 rounded-xl border ${
							isNorm
								? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
								: evaluation.hasCriticalStopFlags
									? "bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] border-2 border-[#ef4444]"
									: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
						}`}
					>
						{isNorm ? (
							<ShieldCheck className="w-4 h-4" />
						) : (
							<ShieldAlert className="w-4 h-4" />
						)}
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
							Соматический анамнез и факторы риска (043/у)
						</h4>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							{patientName ? `Пациент: ${patientName} • ` : ""}
							Амбулаторная безопасность: норма в 1 клик, правка только патологии
						</p>
					</div>
				</div>

				{/* 1-Click Somatic Norm Button (Mandate 8e, 8k) */}
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={handleApplyPhysiologicalNorm}
						className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer active:scale-98 select-none"
						data-testid="mark-somatic-norm-btn"
						title="1 клик: соматически здоров, без отягощенного анамнеза (физиологическая норма)"
						aria-label="Физиологическая норма в 1 клик"
					>
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span>Соматически здоров / норма (1-клик)</span>
					</button>
				</div>
			</div>

			{/* Status Banner */}
			{isNorm ? (
				<div
					className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs font-semibold"
					data-testid="somatic-status-norm-banner"
				>
					<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>
						Физиологическая норма: соматически здоров / без отягощенного анамнеза. Ограничений к местной анестезии нет.
					</span>
				</div>
			) : (
				<div
					className={`flex flex-col gap-1.5 p-3 rounded-xl border text-xs ${
						evaluation.hasCriticalStopFlags
							? "bg-rose-50 dark:bg-rose-950/40 border-2 border-[#ef4444] text-rose-950 dark:text-rose-200 shadow-xs"
							: "bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200"
					}`}
					data-testid="somatic-status-alert-banner"
				>
					<div className="flex items-center gap-2 font-bold">
						<AlertTriangle className={`w-4 h-4 shrink-0 ${evaluation.hasCriticalStopFlags ? "text-[#ef4444]" : "text-amber-600 dark:text-amber-400"}`} />
						<span>
							Обнаружено клинических факторов риска: {evaluation.activeFlags.length}
						</span>
					</div>
					<div className="flex flex-wrap gap-1.5 min-w-0">
						{evaluation.activeFlags.map((flag) => (
							<span
								key={flag.id}
								className={`text-[11px] font-bold px-2 py-0.5 rounded-md border truncate max-w-full ${
									flag.severity === "critical"
										? "bg-[#ef4444] text-white border-[#ef4444]"
										: "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700"
								}`}
								title={flag.titleRu}
							>
								{flag.titleRu}
							</span>
						))}
					</div>
				</div>
			)}

			{/* Outpatient Dental Pathologies Only (Mandate 8i - No Hospital Bloat) */}
			<div className="flex flex-col gap-3">
				{/* Category A: Allergies to Anesthetics and Antibiotics */}
				<div className="space-y-2">
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
						<Pill className="w-3.5 h-3.5 text-rose-500" />
						Аллергологический статус (анестетики, антибиотики, латекс)
					</span>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
						<button
							type="button"
							data-testid="toggle-allergy-articaine"
							onClick={() => toggleFlag("hasArticaineAllergy")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasArticaineAllergy
									? "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Артикаин (Ультракаин, Септанест, Убистезин)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasArticaineAllergy
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasArticaineAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Артикаин (Ультракаин)</span>
						</button>

						<button
							type="button"
							data-testid="toggle-allergy-lidocaine"
							onClick={() => toggleFlag("hasLidocaineAllergy")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasLidocaineAllergy
									? "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Лидокаин"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasLidocaineAllergy
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasLidocaineAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Лидокаин</span>
						</button>

						<button
							type="button"
							data-testid="toggle-allergy-mepivacaine"
							onClick={() => toggleFlag("hasMepivacaineAllergy")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasMepivacaineAllergy
									? "bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-900 dark:text-rose-200"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Мепивакаин (Скандонест, без вазоконстриктора)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasMepivacaineAllergy
										? "bg-rose-600 border-rose-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasMepivacaineAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Мепивакаин (Скандонест)</span>
						</button>

						<button
							type="button"
							data-testid="toggle-allergy-sulfites"
							onClick={() => toggleFlag("hasSulfiteAllergy")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasSulfiteAllergy
									? "bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-900 dark:text-rose-200"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Сульфиты / консерванты в анестетиках с адреналином"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasSulfiteAllergy
										? "bg-rose-600 border-rose-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasSulfiteAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Сульфиты / консервант</span>
						</button>

						<button
							type="button"
							data-testid="toggle-allergy-penicillin"
							onClick={() => toggleFlag("hasPenicillinAllergy")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasPenicillinAllergy
									? "bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-900 dark:text-rose-200"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Антибиотики пенициллинового ряда (Амоксиклав, Аугментин)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasPenicillinAllergy
										? "bg-rose-600 border-rose-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasPenicillinAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Пенициллины</span>
						</button>

						<button
							type="button"
							data-testid="toggle-allergy-latex"
							onClick={() => toggleFlag("hasLatexAllergy")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasLatexAllergy
									? "bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-900 dark:text-rose-200"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Латекс (перчатки, платки коффердама)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasLatexAllergy
										? "bg-rose-600 border-rose-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasLatexAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Латекс (коффердам)</span>
						</button>
					</div>
				</div>

				{/* Category B: Cardiovascular Risks, Hypertension, Anticoagulants, Pacemaker */}
				<div className="space-y-2">
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
						<HeartPulse className="w-3.5 h-3.5 text-blue-500" />
						Гемостаз, кардиология и стоп-факторы
					</span>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
						<button
							type="button"
							data-testid="toggle-hypertension"
							onClick={() => toggleFlag("hasHypertension")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasHypertension
									? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
							}`}
							title="Гипертоническая болезнь / нестабильное АД"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasHypertension
										? "bg-amber-600 border-amber-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasHypertension ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Гипертоническая болезнь</span>
						</button>

						<button
							type="button"
							data-testid="toggle-anticoagulants"
							onClick={() => toggleFlag("takesAnticoagulants")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.takesAnticoagulants
									? "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
							}`}
							title="Антикоагулянты (Ксарелто, Эликвис, Варфарин) — риск кровотечения"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.takesAnticoagulants
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.takesAnticoagulants ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Антикоагулянты (Ксарелто)</span>
						</button>

						<button
							type="button"
							data-testid="toggle-bisphosphonates"
							onClick={() => toggleFlag("takesBisphosphonates")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.takesBisphosphonates
									? "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-purple-50/50"
							}`}
							title="Бисфосфонаты / деносумаб — риск остеонекроза челюсти (MRONJ)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.takesBisphosphonates
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.takesBisphosphonates ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Бисфосфонаты (MRONJ)</span>
						</button>

						<button
							type="button"
							data-testid="toggle-pacemaker"
							onClick={() => toggleFlag("hasPacemakerExs")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasPacemakerExs
									? "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Электрокардиостимулятор (ЭКС) — абсолютный запрет ультразвуковых скейлеров"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasPacemakerExs
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasPacemakerExs ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">ЭКС (Запрет УЗ)</span>
						</button>
					</div>

					{/* Anticoagulant and Bisphosphonate Details (MRONJ & Bleeding Risk) */}
					{(profile.takesAnticoagulants || profile.takesBisphosphonates) && (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700">
							{profile.takesAnticoagulants && (
								<div className="flex flex-col gap-1">
									<label
										htmlFor={anticoagulantInputId}
										className="text-[11px] font-bold text-[var(--ink,#0f172a)] dark:text-slate-200"
									>
										Препарат антикоагулянта и МНО (INR):
									</label>
									<input
										id={anticoagulantInputId}
										type="text"
										value={profile.anticoagulantName || ""}
										onChange={(e) =>
											setProfile((prev) => ({
												...prev,
												anticoagulantName: e.target.value,
											}))
										}
										placeholder="Варфарин (МНО 2.1), Ксарелто 20 мг..."
										className="h-8 px-2.5 text-xs rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
									/>
								</div>
							)}
							{profile.takesBisphosphonates && (
								<div className="flex flex-col gap-1">
									<label
										htmlFor={bisphosphonateInputId}
										className="text-[11px] font-bold text-[var(--ink,#0f172a)] dark:text-slate-200"
									>
										Препарат бисфосфонатов (MRONJ):
									</label>
									<input
										id={bisphosphonateInputId}
										type="text"
										value={profile.bisphosphonateName || ""}
										onChange={(e) =>
											setProfile((prev) => ({
												...prev,
												bisphosphonateName: e.target.value,
											}))
										}
										placeholder="Акласта 5 мг, Пролиа, Фосамакс..."
										className="h-8 px-2.5 text-xs rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
									/>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Category C: Diabetes, Asthma, Pregnancy */}
				<div className="space-y-2">
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
						<Activity className="w-3.5 h-3.5 text-teal-600" />
						Диабет, астма, беременность
					</span>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
						<button
							type="button"
							data-testid="toggle-diabetes"
							onClick={() => toggleFlag("hasDiabetesMellitus")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasDiabetesMellitus
									? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
							}`}
							title="Сахарный диабет (риск замедленной эпителизации и инфекций)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasDiabetesMellitus
										? "bg-amber-600 border-amber-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasDiabetesMellitus ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Сахарный диабет</span>
						</button>

						<button
							type="button"
							data-testid="toggle-asthma"
							onClick={() => toggleFlag("hasBronchialAsthma")}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasBronchialAsthma
									? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
							}`}
							title="Бронхиальная астма (наличие ингалятора у пациента обязательно)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasBronchialAsthma
										? "bg-amber-600 border-amber-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasBronchialAsthma ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Бронхиальная астма</span>
						</button>

						<button
							type="button"
							data-testid="toggle-pregnancy"
							onClick={() => {
								setProfile((prev) => ({
									...prev,
									pregnancyTrimester:
										prev.pregnancyTrimester === "none" ? "trimester_2" : "none",
								}));
							}}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.pregnancyTrimester !== "none"
									? "bg-pink-50 dark:bg-pink-950/50 border-pink-400 text-pink-900 dark:text-pink-200"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-pink-50/50"
							}`}
							title="Беременность (ограничения рентгенографии, местная анестезия без адреналина)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.pregnancyTrimester !== "none"
										? "bg-pink-600 border-pink-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.pregnancyTrimester !== "none" ? (
									<Check className="w-3 h-3" />
								) : null}
							</div>
							<span className="truncate min-w-0">Беременность (2-й триместр)</span>
						</button>
					</div>
				</div>
			</div>

			{/* Notes textarea */}
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor={customNotesId}
					className="text-xs font-semibold text-[var(--muted,#64748b)]"
				>
					Клиническое примечание врача к соматическому анамнезу:
				</label>
				<textarea
					id={customNotesId}
					rows={isCompact ? 2 : 3}
					value={profile.customChronicNotes || ""}
					onChange={(e) =>
						setProfile((prev) => ({ ...prev, customChronicNotes: e.target.value }))
					}
					placeholder="Особые отметки врача по общесоматическому состоянию или переносимости препаратов..."
					className="w-full p-2.5 text-xs rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white placeholder:text-[var(--muted,#64748b)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-all resize-y"
					data-testid="somatic-notes-textarea"
				/>
			</div>

			{/* Bottom Actions: Autonomy Mandate 8e — 0 Disabled Buttons */}
			<div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex-wrap">
				<button
					type="button"
					onClick={handleApplyPhysiologicalNorm}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8 min-h-[32px] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					title="Сбросить все риски до физиологической нормы"
				>
					<RotateCcw className="w-3.5 h-3.5" />
					<span>Сброс в норму</span>
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleSyncToDiary}
						className="inline-flex items-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
						data-testid="sync-diary-btn"
						title="Перенести текущую формулировку в дневник Формы 043/у"
					>
						<FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>В дневник 043/у</span>
					</button>

					<button
						type="button"
						onClick={handleSave}
						className="inline-flex items-center gap-1.5 px-4 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-xs transition-all cursor-pointer active:scale-98"
						data-testid="save-somatic-btn"
						title="Сохранить соматический профиль пациента"
					>
						<Save className="w-4 h-4" />
						<span>Сохранить статус</span>
					</button>
				</div>
			</div>
		</div>
	);
};
