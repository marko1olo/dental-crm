/**
 * apps/web/src/components/patient/PatientAnamnesisTab.tsx
 *
 * Клинический медицинский анамнез, соматический статус и аллергологическая безопасность.
 * Соответствует Высшей Конституции THE HAMMER, Мандату 8e (Автономия врача),
 * Мандату 8v (Тишина интерфейса) и стандарту Apple HIG.
 *
 * Инварианты:
 * 1. 1-кликовая кнопка «✓ Соматически здоров (Норма)» (data-testid="mark-somatic-norm-btn" / "btn-somatic-healthy-norm").
 * 2. 1-кликовые чипы аллергий (Пенициллин, Лидокаин, Артикаин, Латекс, Йод) с мгновенным цветовым выделением.
 * 3. 0 заблокированных кнопок (0 disabled buttons) — автономия врача в любых условиях.
 * 4. Сенсорная эргономика: min-h >= 36px на десктопе, >= 44px на touch-устройствах.
 * 5. WCAG AAA Dark Mode: глубокий темный фон без слепящих белых пятен.
 * 6. Ноль мультяшных эмодзи (только векторная графика Lucide).
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Baby,
	Check,
	CheckCircle2,
	Copy,
	FileText,
	HeartPulse,
	Pill,
	RotateCcw,
	Save,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	ZapOff,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	type PregnancyTrimester,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	isSomaticProfilePhysiologicalNorm,
	parseSafetyProfileFromText,
} from "../patients/safetyMath";
import {
	type AnamnesisPresetType,
	DEFAULT_ANAMNESIS_PROFILE,
	applyAnamnesisPreset,
} from "../patients/patientAnamnesisPresets";
import "../patients/safetyBanner.css";

export interface PatientAnamnesisTabProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly initialProfile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	readonly onSaveProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onSyncToEmkDiary?: ((diarySnippet: string) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly isCompact?: boolean | undefined;
	readonly className?: string | undefined;
}

export const PatientAnamnesisTab: React.FC<PatientAnamnesisTabProps> = React.memo(
	({
		patientId,
		patientName,
		initialProfile,
		onSaveProfile,
		onSyncToEmkDiary,
		onApplySomaticNorm,
		isCompact = false,
		className = "",
	}) => {
		const customNotesId = useId();
		const anticoagulantInputId = useId();
		const bisphosphonateInputId = useId();

		const [profile, setProfile] = useState<PatientClinicalSafetyProfile>(() => {
			if (!initialProfile) return DEFAULT_SOMATIC_HEALTHY_NORM;
			if (typeof initialProfile === "string") {
				return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...parseSafetyProfileFromText(initialProfile) };
			}
			return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...initialProfile };
		});

		useEffect(() => {
			if (initialProfile) {
				if (typeof initialProfile === "string") {
					setProfile((prev) => ({
						...prev,
						...parseSafetyProfileFromText(initialProfile),
					}));
				} else {
					setProfile((prev) => ({ ...prev, ...initialProfile }));
				}
			}
		}, [initialProfile]);

		const evaluation = useMemo(() => evaluatePatientSafetyFlags(profile), [profile]);
		const isNorm = useMemo(() => isSomaticProfilePhysiologicalNorm(profile), [profile]);
		const diaryText = useMemo(() => formatSafetyProfileToDiaryText(profile), [profile]);

		const updateField = useCallback(
			<K extends keyof PatientClinicalSafetyProfile>(
				key: K,
				value: PatientClinicalSafetyProfile[K],
			) => {
				setProfile((prev) => ({
					...prev,
					[key]: value,
				}));
			},
			[],
		);

		const toggleField = useCallback((key: keyof PatientClinicalSafetyProfile) => {
			setProfile((prev) => ({
				...prev,
				[key]: !prev[key],
			}));
		}, []);

		// 1-Click Физиологическая норма (Мандаты 8e, 8k)
		const handleApplyPhysiologicalNorm = useCallback(() => {
			const cleanNorm = createHealthySomaticNormProfile();
			const updated: PatientClinicalSafetyProfile = {
				...cleanNorm,
				customChronicNotes:
					"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.",
				lastUpdated: new Date().toISOString(),
			};
			setProfile(updated);
			if (onApplySomaticNorm) {
				onApplySomaticNorm();
			}
			if (onSaveProfile) {
				onSaveProfile(updated);
			}
			showToast("Применена физиологическая норма: соматически здоров", "success", 3000);
		}, [onApplySomaticNorm, onSaveProfile]);

		// Автосохранение с дебаунсом (Мандат 8e: тишина без выкидываний и потери данных)
		const isFirstMount = useRef(true);
		useEffect(() => {
			if (isFirstMount.current) {
				isFirstMount.current = false;
				return;
			}
			if (!onSaveProfile) return;
			const timer = setTimeout(() => {
				onSaveProfile({
					...profile,
					lastUpdated: new Date().toISOString(),
				});
			}, 900);
			return () => clearTimeout(timer);
		}, [profile, onSaveProfile]);

		// Быстрые пресеты
		const handleApplyPreset = useCallback((presetType: AnamnesisPresetType) => {
			setProfile((prev) => {
				const res = applyAnamnesisPreset(prev, presetType);
				showToast(res.toastMessage, res.toastType);
				return res.updatedProfile;
			});
		}, []);

		// Сохранение вручную
		const handleSave = useCallback(() => {
			const finalProfile: PatientClinicalSafetyProfile = {
				...profile,
				lastUpdated: new Date().toISOString(),
			};
			if (onSaveProfile) {
				onSaveProfile(finalProfile);
			}
			showToast("Соматический статус пациента сохранен", "success", 2500);
		}, [profile, onSaveProfile]);

		// Перенос в дневник приёма (Форма 043/у)
		const handleSyncToDiary = useCallback(() => {
			if (onSyncToEmkDiary) {
				onSyncToEmkDiary(diaryText);
			}
			if (navigator.clipboard?.writeText) {
				navigator.clipboard.writeText(diaryText).catch(() => {});
			}
			showToast("Клинический анамнез перенесён в дневник приёма", "success", 3000);
		}, [diaryText, onSyncToEmkDiary]);

		return (
			<div
				className={`patient-anamnesis-tab flex flex-col gap-4 w-full p-4 sm:p-5 rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-100 shadow-xs ${className}`}
				data-testid="patient-anamnesis-tab"
				data-patient-id={patientId ?? undefined}
			>
				{/* Top Bar: Заголовок и 1-кликовая Норма */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 pb-3.5">
					<div className="flex items-center gap-3">
						<div
							className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border shrink-0 transition-colors ${
								isNorm
									? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80"
									: evaluation.hasCriticalStopFlags
										? "bg-rose-50 dark:bg-rose-950/50 text-[#ef4444] border-2 border-[#ef4444]"
										: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
							}`}
						>
							{isNorm ? (
								<ShieldCheck className="w-5 h-5" />
							) : (
								<ShieldAlert className="w-5 h-5" />
							)}
						</div>
						<div className="min-w-0">
							<h3 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] dark:text-white m-0 truncate">
								Анамнез жизни, соматический статус и аллергии
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 truncate">
								{patientName ? `${patientName} • ` : ""}
								Безопасность у кресла: 1-клик норма, быстрые чипы аллергенов
							</p>
						</div>
					</div>

					{/* 1-Click Кнопка соматической нормы (Мандат 8e, 8k) */}
					<div className="flex items-center gap-2 flex-wrap shrink-0">
						<button
							type="button"
							onClick={handleApplyPhysiologicalNorm}
							className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[36px] sm:min-h-[36px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer active:scale-98 select-none shrink-0"
							data-testid="mark-somatic-norm-btn"
							title="Зафиксировать соматическое здоровье: аллергоанамнез не отягощен"
							aria-label="Физиологическая норма"
						>
							<ShieldCheck className="w-4 h-4 shrink-0" />
							<span>✓ Соматически здоров (Норма)</span>
						</button>
					</div>
				</div>

				{/* Статусный баннер нормы или критического предупреждения */}
				{isNorm ? (
					<div
						className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs font-semibold"
						data-testid="somatic-status-norm-banner"
					>
						<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>
							Физиологическая норма: соматически здоров, аллергоанамнез не отягощен. Противопоказаний к анестетикам и амбулаторной стоматологии нет.
						</span>
					</div>
				) : (
					<div
						className={`flex flex-col gap-2 p-3.5 rounded-xl border text-xs ${
							evaluation.hasCriticalStopFlags
								? "bg-rose-50 dark:bg-rose-950/40 border-2 border-[#ef4444] text-rose-950 dark:text-rose-100 shadow-xs"
								: "bg-amber-50 dark:bg-amber-950/40 border border-amber-400 text-amber-950 dark:text-amber-100"
						}`}
						data-testid="somatic-status-alert-banner"
						role="alert"
					>
						<div className="flex items-center gap-2 font-bold">
							<AlertOctagon
								className={`w-4 h-4 shrink-0 ${
									evaluation.hasCriticalStopFlags
										? "text-[#ef4444]"
										: "text-amber-600 dark:text-amber-400"
								}`}
							/>
							<span>
								Обнаружено клинических факторов риска: {evaluation.activeFlags.length}
							</span>
						</div>
						<div className="flex flex-wrap gap-1.5 min-w-0">
							{evaluation.activeFlags.map((flag) => (
								<span
									key={flag.id}
									className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border truncate max-w-full ${
										flag.severity === "critical"
											? "bg-[#ef4444] text-white border-[#ef4444]"
											: "bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 border-amber-300 dark:border-amber-700"
									}`}
									title={flag.description || flag.titleRu}
								>
									{flag.shortBadge || flag.titleRu}
								</span>
							))}
						</div>
					</div>
				)}

				{/* 1. БЫСТРЫЕ ЧИПЫ АЛЛЕРГИЙ (Пенициллин, Лидокаин, Артикаин, Латекс, Йод) */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
							<Pill className="w-3.5 h-3.5 text-rose-500" />
							1. Аллергологический статус (1-кликовые чипы)
						</span>
						<span className="text-[11px] text-[var(--muted,#64748b)]">
							Красный — аллергия / Серый — норма
						</span>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
						{/* Пенициллин */}
						<button
							type="button"
							data-testid="toggle-allergy-penicillin"
							onClick={() => toggleField("hasPenicillinAllergy")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
								profile.hasPenicillinAllergy
									? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
							}`}
							title="Пенициллиновый ряд (Амоксиклав, Аугментин)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasPenicillinAllergy
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasPenicillinAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Пенициллин</span>
						</button>

						{/* Лидокаин */}
						<button
							type="button"
							data-testid="toggle-allergy-lidocaine"
							onClick={() => toggleField("hasLidocaineAllergy")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
								profile.hasLidocaineAllergy
									? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
							}`}
							title="Лидокаин (спреи, инфильтрационная анестезия)"
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

						{/* Артикаин */}
						<button
							type="button"
							data-testid="toggle-allergy-articaine"
							onClick={() => toggleField("hasArticaineAllergy")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
								profile.hasArticaineAllergy
									? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
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
							<span className="truncate min-w-0">Артикаин</span>
						</button>

						{/* Латекс */}
						<button
							type="button"
							data-testid="toggle-allergy-latex"
							onClick={() => toggleField("hasLatexAllergy")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
								profile.hasLatexAllergy
									? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
							}`}
							title="Латекс (коффердам, перчатки) — нитриловый протокол"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasLatexAllergy
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasLatexAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Латекс</span>
						</button>

						{/* Йод */}
						<button
							type="button"
							data-testid="toggle-allergy-iodine"
							onClick={() => toggleField("hasIodineAllergy")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
								profile.hasIodineAllergy
									? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
							}`}
							title="Йод и йодоформсодержащие препараты (Бетадин, Метапекс, Альвожил)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasIodineAllergy
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasIodineAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Йод (Альвожил)</span>
						</button>
					</div>
				</div>

				{/* 2. СОМАТИЧЕСКИЕ СТОП-ФАКТОРЫ И ХРОНИЧЕСКИЕ ЗАБОЛЕВАНИЯ */}
				<div className="space-y-2">
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
						<HeartPulse className="w-3.5 h-3.5 text-blue-500" />
						2. Соматические факторы риска и препараты
					</span>

					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
						{/* Гипертония */}
						<button
							type="button"
							data-testid="toggle-hypertension"
							onClick={() => toggleField("hasHypertension")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasHypertension
									? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
							}`}
							title="Гипертоническая болезнь / ИБС (лимит адреналина 0.04 мг)"
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
							<span className="truncate min-w-0">Гипертония (АД)</span>
						</button>

						{/* Кардиостимулятор / ЭКС */}
						<button
							type="button"
							data-testid="toggle-pacemaker"
							onClick={() => toggleField("hasPacemakerExs")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasPacemakerExs
									? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Имплантированный кардиостимулятор — абсолютный запрет УЗ-скейлеров"
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

						{/* Антикоагулянты */}
						<button
							type="button"
							data-testid="toggle-anticoagulants"
							onClick={() => toggleField("takesAnticoagulants")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.takesAnticoagulants
									? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
							}`}
							title="Антикоагулянты (Ксарелто, Варфарин, Эликвис) — контроль гемостаза"
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
							<span className="truncate min-w-0">Антикоагулянты</span>
						</button>

						{/* Бисфосфонаты */}
						<button
							type="button"
							data-testid="toggle-bisphosphonates"
							onClick={() => toggleField("takesBisphosphonates")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.takesBisphosphonates
									? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-purple-50/50"
							}`}
							title="Бисфосфонатная терапия — риск медикаментозного остеонекроза челюсти (MRONJ)"
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

						{/* Сахарный диабет */}
						<button
							type="button"
							data-testid="toggle-diabetes"
							onClick={() => toggleField("hasDiabetesMellitus")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasDiabetesMellitus
									? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
							}`}
							title="Сахарный диабет (риск гипогликемии и замедленной регенерации)"
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

						{/* Бронхиальная астма */}
						<button
							type="button"
							data-testid="toggle-asthma"
							onClick={() => toggleField("hasBronchialAsthma")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasBronchialAsthma
									? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
							}`}
							title="Бронхиальная астма (ингалятор пациента должен быть на манипуляционном столике)"
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

						{/* Беременность */}
						<button
							type="button"
							data-testid="toggle-pregnancy"
							onClick={() => {
								updateField(
									"pregnancyTrimester",
									profile.pregnancyTrimester === "none" ? "trimester_2" : "none",
								);
							}}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.pregnancyTrimester !== "none"
									? "bg-pink-50 dark:bg-pink-950/50 border-pink-400 text-pink-900 dark:text-pink-200 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-pink-50/50"
							}`}
							title="Беременность (2-й триместр — безопасное окно, анестетики без адреналина)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.pregnancyTrimester !== "none"
										? "bg-pink-600 border-pink-600 text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.pregnancyTrimester !== "none" ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">Беременность (2 трим)</span>
						</button>

						{/* НПВП / Аспириновая триада */}
						<button
							type="button"
							data-testid="toggle-nsaid"
							onClick={() => toggleField("hasNsaidAllergy")}
							className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								profile.hasNsaidAllergy
									? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
							}`}
							title="Непереносимость НПВП (Аспирин, Кеторол, Ибупрофен)"
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									profile.hasNsaidAllergy
										? "bg-[#ef4444] border-[#ef4444] text-white"
										: "border-slate-300 dark:border-slate-600"
								}`}
							>
								{profile.hasNsaidAllergy ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">НПВП / Аспирин</span>
						</button>
					</div>

					{/* Уточнение антикоагулянтов / бисфосфонатов */}
					{(profile.takesAnticoagulants || profile.takesBisphosphonates) && (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700 mt-2">
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
										onChange={(e) => updateField("anticoagulantName", e.target.value)}
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
										Препарат бисфосфонатной терапии (MRONJ):
									</label>
									<input
										id={bisphosphonateInputId}
										type="text"
										value={profile.bisphosphonateName || ""}
										onChange={(e) => updateField("bisphosphonateName", e.target.value)}
										placeholder="Акласта 5 мг/год, Пролиа, Фосамакс..."
										className="h-8 px-2.5 text-xs rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
									/>
								</div>
							)}
						</div>
					)}
				</div>

				{/* 3. ДОПОЛНИТЕЛЬНЫЕ ЗАМЕТКИ ВРАЧА */}
				<div className="flex flex-col gap-1.5">
					<label
						htmlFor={customNotesId}
						className="text-xs font-semibold text-[var(--muted,#64748b)]"
					>
						Клинические примечания к анамнезу и постоянная лекарственная терапия:
					</label>
					<textarea
						id={customNotesId}
						rows={isCompact ? 2 : 3}
						value={profile.customChronicNotes || ""}
						onChange={(e) => updateField("customChronicNotes", e.target.value)}
						placeholder="Индивидуальные особенности, перенесенные операции, реакция на анестетики..."
						className="w-full p-2.5 text-xs rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white placeholder:text-[var(--muted,#64748b)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-all resize-y"
						data-testid="somatic-notes-textarea"
					/>
				</div>

				{/* 4. SOAP СНИППЕТ ДЛЯ ДНЕВНИКА ПРИЁМА */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 border border-[var(--line,#e2e8f0)] dark:border-slate-700 flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
							Предпросмотр записи для Формы 043/у (Дневник приёма):
						</span>
						<button
							type="button"
							onClick={handleSyncToDiary}
							className="text-xs font-bold text-[var(--teal,#0d9488)] hover:underline inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer min-h-[32px] px-2 select-none"
						>
							<Copy className="w-3.5 h-3.5" />
							<span>Скопировать</span>
						</button>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[11.5px] font-mono text-[var(--ink,#0f172a)] dark:text-slate-200 border border-[var(--line,#e2e8f0)] dark:border-slate-700 whitespace-pre-wrap select-all">
						{diaryText}
					</div>
				</div>

				{/* Нижняя панель действий: 0 disabled кнопок */}
				<div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex-wrap">
					<button
						type="button"
						onClick={handleApplyPhysiologicalNorm}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8 min-h-[36px] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
						title="Сбросить все риски до физиологической нормы"
					>
						<RotateCcw className="w-3.5 h-3.5" />
						<span>Сброс в норму</span>
					</button>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleSyncToDiary}
							className="inline-flex items-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none"
							data-testid="sync-diary-btn"
							title="Перенести текущую формулировку в дневник приёма"
						>
							<FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
							<span>В дневник приёма</span>
						</button>

						<button
							type="button"
							onClick={handleSave}
							className="inline-flex items-center gap-1.5 px-4 py-1.5 h-8 sm:h-9 min-h-[36px] rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-xs transition-all cursor-pointer active:scale-98 select-none"
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
	},
);

PatientAnamnesisTab.displayName = "PatientAnamnesisTab";
export default PatientAnamnesisTab;
