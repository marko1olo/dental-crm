import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Baby,
	Check,
	Copy,
	FileText,
	HeartPulse,
	Pill,
	Printer,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	X,
	ZapOff,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import {
	type PatientClinicalSafetyProfile,
	type PregnancyTrimester,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	parseSafetyProfileFromText,
} from "./safetyMath";
import "./safetyBanner.css";

export interface PatientAnamnesisModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly initialProfile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	readonly onSaveProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onSyncToEmkDiary?: ((diarySnippet: string) => void) | undefined;
}

const DEFAULT_PROFILE: PatientClinicalSafetyProfile = {
	hasLidocaineAllergy: false,
	hasArticaineAllergy: false,
	hasMepivacaineAllergy: false,
	hasSulfiteAllergy: false,
	hasAnaphylaxisHistory: false,
	hasPacemakerExs: false,
	hasCardiovascularDisease: false,
	hasHypertension: false,
	takesAnticoagulants: false,
	anticoagulantName: "",
	takesBisphosphonates: false,
	bisphosphonateName: "",
	pregnancyTrimester: "none",
	hasDiabetesMellitus: false,
	diabetesType: "unknown",
	hasBronchialAsthma: false,
	hasEpilepsy: false,
	hasHepatitis: false,
	hasHiv: false,
	hasThyroidDisease: false,
	hasPenicillinAllergy: false,
	hasLatexAllergy: false,
	customAllergyNotes: "",
	customChronicNotes: "",
	currentMedicationsList: "",
};

export const PatientAnamnesisModal: React.FC<PatientAnamnesisModalProps> = React.memo(
	({
		isOpen,
		onClose,
		patientId,
		patientName,
		initialProfile,
		onSaveProfile,
		onSyncToEmkDiary,
	}) => {
		const [profile, setProfile] = useState<PatientClinicalSafetyProfile>(() => {
			if (!initialProfile) return DEFAULT_PROFILE;
			if (typeof initialProfile === "string") {
				return { ...DEFAULT_PROFILE, ...parseSafetyProfileFromText(initialProfile) };
			}
			return { ...DEFAULT_PROFILE, ...initialProfile };
		});

		// Синхронизация при открытии модального окна с новыми данными
		useEffect(() => {
			if (isOpen) {
				if (!initialProfile) {
					setProfile(DEFAULT_PROFILE);
				} else if (typeof initialProfile === "string") {
					setProfile({ ...DEFAULT_PROFILE, ...parseSafetyProfileFromText(initialProfile) });
				} else {
					setProfile({ ...DEFAULT_PROFILE, ...initialProfile });
				}
			}
		}, [isOpen, initialProfile]);

		// Обработка закрытия по Escape
		useEffect(() => {
			if (!isOpen) return;
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					onClose();
				}
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		const evaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(profile);
		}, [profile]);

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

		// Быстрые клинические пресеты (1-Click шаблоны)
		const applyPreset = useCallback((presetType: "clean" | "cardio" | "anticoag" | "bisphosphonate" | "pregnant_2" | "allergy_articaine") => {
			switch (presetType) {
				case "clean":
					setProfile({
						...DEFAULT_PROFILE,
						customChronicNotes: "Соматически здоров. Аллергический статус не отягощен.",
					});
					showToast("Применен шаблон: Анамнез не отягощен (Здоров)", "info");
					break;
				case "cardio":
					setProfile((prev) => ({
						...prev,
						hasHypertension: true,
						hasCardiovascularDisease: true,
						hasPacemakerExs: true,
					}));
					showToast("Применен шаблон: ЭКС + Гипертоническая болезнь (Запрет УЗ)", "warning");
					break;
				case "anticoag":
					setProfile((prev) => ({
						...prev,
						takesAnticoagulants: true,
						anticoagulantName: "Ксарелто 20 мг (Ривароксабан)",
						hasCardiovascularDisease: true,
					}));
					showToast("Применен шаблон: Прием антикоагулянтов (Риск кровотечения)", "warning");
					break;
				case "bisphosphonate":
					setProfile((prev) => ({
						...prev,
						takesBisphosphonates: true,
						bisphosphonateName: "Акласта (Золедроновая к-та)",
					}));
					showToast("Применен шаблон: Бисфосфонаты (Риск остеонекроза MRONJ)", "warning");
					break;
				case "pregnant_2":
					setProfile((prev) => ({
						...prev,
						pregnancyTrimester: "trimester_2",
						gestationalWeeks: 20,
					}));
					showToast("Применен шаблон: Беременность 2 триместр (Безопасное окно)", "info");
					break;
				case "allergy_articaine":
					setProfile((prev) => ({
						...prev,
						hasArticaineAllergy: true,
						hasBronchialAsthma: true,
						hasSulfiteAllergy: true,
					}));
					showToast("Применен шаблон: Аллергия на Артикаин + Астма + Сульфиты", "error");
					break;
			}
		}, []);

		const handleSave = useCallback(() => {
			const finalProfile: PatientClinicalSafetyProfile = {
				...profile,
				lastUpdated: new Date().toISOString(),
			};
			if (onSaveProfile) {
				onSaveProfile(finalProfile);
			}
			showToast("Анкета здоровья и профиль безопасности пациента сохранены", "success");
			onClose();
		}, [profile, onSaveProfile, onClose]);

		const handleSyncToEmk = useCallback(() => {
			const diarySnippet = formatSafetyProfileToDiaryText(profile);
			if (onSyncToEmkDiary) {
				onSyncToEmkDiary(diarySnippet);
			}
			navigator.clipboard?.writeText?.(diarySnippet).catch(() => {});
			showToast("Клинический анамнез скопирован и синхронизирован с протоколом 043/у", "success");
		}, [profile, onSyncToEmkDiary]);

		const handlePrintQuestionnaire = useCallback(() => {
			window.print();
		}, []);

		if (!isOpen) return null;

		return (
			<div
				className="anamnesis-modal-backdrop"
				role="dialog"
				aria-modal="true"
				aria-labelledby="anamnesis-modal-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				<div className="anamnesis-modal" onClick={(e) => e.stopPropagation()}>
					{/* Header */}
					<div className="anamnesis-modal__header">
						<div className="flex items-center gap-3">
							<div
								className={`flex items-center justify-center w-10 h-10 rounded-xl ${
									evaluation.hasCriticalStopFlags
										? "bg-rose-500 text-white"
										: evaluation.hasHighRiskFlags
											? "bg-amber-500 text-white"
											: "bg-[var(--brand-primary)] text-white"
								}`}
							>
								<Stethoscope className="w-5 h-5" />
							</div>
							<div>
								<h2 id="anamnesis-modal-title" className="text-base font-black text-[var(--ink,#1e293b)] dark:text-white m-0">
									Анкета здоровья и клинические стоп-факторы
								</h2>
								<p className="text-xs text-[var(--muted,#64748b)] m-0">
									{patientName ? `Пациент: ${patientName}` : "Клинический опросник и факторы риска"}
									{patientId ? ` (ID: ${patientId.slice(0, 8)})` : ""}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handlePrintQuestionnaire}
								className="safety-btn safety-btn--outline"
								title="Печать анкеты пациента"
								aria-label="Печать анкеты пациента"
							>
								<Printer className="w-4 h-4" />
								Печать
							</button>
							<button
								type="button"
								onClick={onClose}
								className="safety-btn safety-btn--ghost min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
								aria-label="Закрыть модальное окно"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>

					{/* Quick Presets Bar */}
					<div className="px-5 py-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-700 flex items-center gap-2 overflow-x-auto">
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider shrink-0 flex items-center gap-1">
							<Sparkles className="w-3 h-3 text-amber-500" />
							Пресеты:
						</span>
						<button
							type="button"
							onClick={() => applyPreset("clean")}
							className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-100 cursor-pointer shrink-0 transition-colors inline-flex items-center gap-1"
						>
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
							<span>Здоров</span>
						</button>
						<button
							type="button"
							onClick={() => applyPreset("cardio")}
							className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/50 hover:bg-rose-100 cursor-pointer shrink-0 transition-colors inline-flex items-center gap-1"
						>
							<AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
							<span>ЭКС + Кардио</span>
						</button>
						<button
							type="button"
							onClick={() => applyPreset("anticoag")}
							className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 hover:bg-amber-100 cursor-pointer shrink-0 transition-colors inline-flex items-center gap-1"
						>
							<AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
							<span>Антикоагулянты</span>
						</button>
						<button
							type="button"
							onClick={() => applyPreset("bisphosphonate")}
							className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50 hover:bg-purple-100 cursor-pointer shrink-0 transition-colors inline-flex items-center gap-1"
						>
							<AlertOctagon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
							<span>Бисфосфонаты</span>
						</button>
						<button
							type="button"
							onClick={() => applyPreset("pregnant_2")}
							className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-pink-50 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-300 dark:border-pink-700/50 hover:bg-pink-100 cursor-pointer shrink-0 transition-colors inline-flex items-center gap-1"
						>
							<Baby className="w-3.5 h-3.5 text-pink-600 shrink-0" />
							<span>Беременность 2 трим.</span>
						</button>
						<button
							type="button"
							onClick={() => applyPreset("allergy_articaine")}
							className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/50 hover:bg-rose-100 cursor-pointer shrink-0 transition-colors inline-flex items-center gap-1"
						>
							<AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
							<span>Аллергия на Артикаин</span>
						</button>
					</div>

					{/* Modal Body */}
					<div className="anamnesis-modal__body">
						{/* Active Stop-Flags Banner if detected */}
						{evaluation.activeFlags.length > 0 && (
							<div
								className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
									evaluation.hasCriticalStopFlags
										? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-950 dark:text-rose-200"
										: "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-200"
								}`}
							>
								<div className="flex items-center gap-2 font-bold text-xs">
									<AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
									<span>
										Обнаружено {evaluation.activeFlags.length} клинических факторов риска:
									</span>
								</div>
								<div className="flex flex-wrap gap-1.5">
									{evaluation.activeFlags.map((f) => (
										<span
											key={f.id}
											className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
												f.severity === "critical"
													? "bg-rose-600 text-white"
													: "bg-amber-600 text-white"
											}`}
										>
											{f.shortBadge}
										</span>
									))}
								</div>
							</div>
						)}

						{/* 1. КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ (RED FLAGS) */}
						<div className="anamnesis-group">
							<h3 className="anamnesis-group__title text-rose-700 dark:text-rose-400">
								<AlertTriangle className="w-4 h-4 text-rose-600" />
								1. Критические стоп-факторы и аллергии на анестетики
							</h3>
							<div className="anamnesis-grid">
								{/* Артикаин */}
								<div
									onClick={() => updateField("hasArticaineAllergy", !profile.hasArticaineAllergy)}
									className={`anamnesis-toggle-item ${profile.hasArticaineAllergy ? "anamnesis-toggle-item--active-critical" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Аллергия на Артикаин (Ультракаин, Септанест)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasArticaineAllergy ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Лидокаин */}
								<div
									onClick={() => updateField("hasLidocaineAllergy", !profile.hasLidocaineAllergy)}
									className={`anamnesis-toggle-item ${profile.hasLidocaineAllergy ? "anamnesis-toggle-item--active-critical" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Аллергия на Лидокаин (спреи и инъекции)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasLidocaineAllergy ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Мепивакаин */}
								<div
									onClick={() => updateField("hasMepivacaineAllergy", !profile.hasMepivacaineAllergy)}
									className={`anamnesis-toggle-item ${profile.hasMepivacaineAllergy ? "anamnesis-toggle-item--active-critical" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Аллергия на Мепивакаин (Скандонест)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasMepivacaineAllergy ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Сульфиты */}
								<div
									onClick={() => updateField("hasSulfiteAllergy", !profile.hasSulfiteAllergy)}
									className={`anamnesis-toggle-item ${profile.hasSulfiteAllergy ? "anamnesis-toggle-item--active-critical" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Аллергия на сульфиты / консерванты (E223)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasSulfiteAllergy ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Кардиостимулятор */}
								<div
									onClick={() => updateField("hasPacemakerExs", !profile.hasPacemakerExs)}
									className={`anamnesis-toggle-item ${profile.hasPacemakerExs ? "anamnesis-toggle-item--active-critical" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										<ZapOff className="w-3.5 h-3.5 inline mr-1 text-rose-500" />
										Кардиостимулятор / ЭКС (Запрет УЗ и коагуляции)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasPacemakerExs ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Бисфосфонаты */}
								<div
									onClick={() => updateField("takesBisphosphonates", !profile.takesBisphosphonates)}
									className={`anamnesis-toggle-item ${profile.takesBisphosphonates ? "anamnesis-toggle-item--active-critical" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										<ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-rose-500" />
										Бисфосфонаты / Акласта (Риск остеонекроза)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.takesBisphosphonates ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Антикоагулянты */}
								<div
									onClick={() => updateField("takesAnticoagulants", !profile.takesAnticoagulants)}
									className={`anamnesis-toggle-item ${profile.takesAnticoagulants ? "anamnesis-toggle-item--active-critical" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										<Pill className="w-3.5 h-3.5 inline mr-1 text-rose-500" />
										Антикоагулянты (Варфарин, Ксарелто, Эликвис)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.takesAnticoagulants ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>
							</div>

							{/* Extra details for anticoagulants / bisphosphonates if active */}
							{(profile.takesAnticoagulants || profile.takesBisphosphonates) && (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 rounded-xl border border-[var(--line,#e2e8f0)]">
									{profile.takesAnticoagulants && (
										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-[var(--ink,#1e293b)] dark:text-slate-200">
												Препарат антикоагулянта и последнее МНО (INR):
											</label>
											<input
												type="text"
												value={profile.anticoagulantName || ""}
												onChange={(e) => updateField("anticoagulantName", e.target.value)}
												placeholder="Например: Варфарин 5 мг (МНО 2.1) или Ксарелто 20 мг"
												className="px-3 py-2 rounded-lg border border-[var(--line,#cbd5e1)] text-xs bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#1e293b)] dark:text-white"
											/>
										</div>
									)}
									{profile.takesBisphosphonates && (
										<div className="flex flex-col gap-1.5">
											<label className="text-xs font-bold text-[var(--ink,#1e293b)] dark:text-slate-200">
												Препарат бисфосфонатной терапии:
											</label>
											<input
												type="text"
												value={profile.bisphosphonateName || ""}
												onChange={(e) => updateField("bisphosphonateName", e.target.value)}
												placeholder="Например: Акласта 5 мг/год или Пролиа 60 мг"
												className="px-3 py-2 rounded-lg border border-[var(--line,#cbd5e1)] text-xs bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#1e293b)] dark:text-white"
											/>
										</div>
									)}
								</div>
							)}
						</div>

						{/* 2. БЕРЕМЕННОСТЬ И ЛАКТАЦИЯ */}
						<div className="anamnesis-group">
							<h3 className="anamnesis-group__title text-pink-700 dark:text-pink-400">
								<Baby className="w-4 h-4 text-pink-600" />
								2. Беременность и период лактации
							</h3>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
								{[
									{ key: "none", label: "Нет беременности" },
									{ key: "trimester_1", label: "1 триместр (1-12 нед)" },
									{ key: "trimester_2", label: "2 триместр (13-27 нед)" },
									{ key: "trimester_3", label: "3 триместр (28-40 нед)" },
									{ key: "lactation", label: "Грудное вскармливание" },
								].map((t) => {
									const isSelected = profile.pregnancyTrimester === t.key;
									return (
										<button
											key={t.key}
											type="button"
											onClick={() => updateField("pregnancyTrimester", t.key as PregnancyTrimester)}
											className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center text-center ${
												isSelected
													? "bg-pink-600 text-white border-pink-600 shadow-sm"
													: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#1e293b)] dark:text-slate-200 border-[var(--line,#e2e8f0)] dark:border-slate-700 hover:border-pink-500"
											}`}
										>
											{t.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* 3. ХРОНИЧЕСКИЕ СОМАТИЧЕСКИЕ ЗАБОЛЕВАНИЯ */}
						<div className="anamnesis-group">
							<h3 className="anamnesis-group__title text-amber-700 dark:text-amber-400">
								<Activity className="w-4 h-4 text-amber-600" />
								3. Соматический статус и хронические заболевания
							</h3>
							<div className="anamnesis-grid">
								{/* Гипертония */}
								<div
									onClick={() => updateField("hasHypertension", !profile.hasHypertension)}
									className={`anamnesis-toggle-item ${profile.hasHypertension ? "anamnesis-toggle-item--active-high" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										<HeartPulse className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
										Гипертония / ИБС (Лимит адреналина 0.04 мг)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasHypertension ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Сахарный диабет */}
								<div
									onClick={() => updateField("hasDiabetesMellitus", !profile.hasDiabetesMellitus)}
									className={`anamnesis-toggle-item ${profile.hasDiabetesMellitus ? "anamnesis-toggle-item--active-high" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Сахарный диабет (Риск гипогликемии)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasDiabetesMellitus ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Бронхиальная астма */}
								<div
									onClick={() => updateField("hasBronchialAsthma", !profile.hasBronchialAsthma)}
									className={`anamnesis-toggle-item ${profile.hasBronchialAsthma ? "anamnesis-toggle-item--active-high" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Бронхиальная астма (Ингалятор наготове)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasBronchialAsthma ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Эпилепсия */}
								<div
									onClick={() => updateField("hasEpilepsy", !profile.hasEpilepsy)}
									className={`anamnesis-toggle-item ${profile.hasEpilepsy ? "anamnesis-toggle-item--active-high" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Эпилепсия (Защита от света светильника)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasEpilepsy ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Гепатит B/C, ВИЧ */}
								<div
									onClick={() => updateField("hasHepatitis", !profile.hasHepatitis)}
									className={`anamnesis-toggle-item ${profile.hasHepatitis ? "anamnesis-toggle-item--active-high" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Вирусный гепатит B / C (СанПиН 3.3686-21)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasHepatitis ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* ВИЧ */}
								<div
									onClick={() => updateField("hasHiv", !profile.hasHiv)}
									className={`anamnesis-toggle-item ${profile.hasHiv ? "anamnesis-toggle-item--active-high" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										ВИЧ-инфекция (СанПиН 3.3686-21)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasHiv ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Пенициллины */}
								<div
									onClick={() => updateField("hasPenicillinAllergy", !profile.hasPenicillinAllergy)}
									className={`anamnesis-toggle-item ${profile.hasPenicillinAllergy ? "anamnesis-toggle-item--active-high" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Аллергия на Пенициллин (Амоксиклав)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasPenicillinAllergy ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>

								{/* Латекс */}
								<div
									onClick={() => updateField("hasLatexAllergy", !profile.hasLatexAllergy)}
									className={`anamnesis-toggle-item ${profile.hasLatexAllergy ? "anamnesis-toggle-item--active-high" : ""}`}
								>
									<span className="anamnesis-toggle-item__label">
										Аллергия на латекс (Нитриловый режим)
									</span>
									<div className="anamnesis-toggle-item__icon">
										{profile.hasLatexAllergy ? <Check className="w-3.5 h-3.5" /> : null}
									</div>
								</div>
							</div>
						</div>

						{/* 4. ДОПОЛНИТЕЛЬНЫЕ ЗАМЕТКИ И ГОЛОСОВОЙ ВВОД */}
						<div className="anamnesis-group">
							<div className="flex items-center justify-between">
								<h3 className="anamnesis-group__title text-[var(--ink,#1e293b)] dark:text-slate-200">
									<FileText className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
									4. Дополнительные примечания врача и постоянные препараты
								</h3>
								<SmartMicrophoneButton
									context="patient"
									onResult={(text) => {
										updateField(
											"customChronicNotes",
											profile.customChronicNotes
												? `${profile.customChronicNotes} ${text}`
												: text,
										);
									}}
								/>
							</div>
							<textarea
								rows={3}
								value={profile.customChronicNotes || ""}
								onChange={(e) => updateField("customChronicNotes", e.target.value)}
								placeholder="Индивидуальные особенности, перенесенные операции, принимаемые медикаменты или аллергические реакции в анамнезе..."
								className="w-full p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900 text-xs text-[var(--ink,#1e293b)] dark:text-slate-100 outline-none focus:border-[var(--teal,var(--brand-primary))] resize-y"
							/>
						</div>

						{/* 5. ФОРМА 043/У SOAP СНИППЕТ ДЛЯ ДНЕВНИКА */}
						<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700 flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
									Предпросмотр записи для дневника (форма 043/у):
								</span>
								<button
									type="button"
									onClick={handleSyncToEmk}
									className="text-xs font-bold text-[var(--teal-dark,var(--teal))] hover:underline inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer"
								>
									<Copy className="w-3.5 h-3.5" />
									Скопировать
								</button>
							</div>
							<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[11.5px] font-mono text-[var(--ink,#1e293b)] dark:text-slate-300 border border-[var(--line,#e2e8f0)] dark:border-slate-800 whitespace-pre-wrap">
								{evaluation.formattedDiarySection}
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="anamnesis-modal__footer">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleSyncToEmk}
								className="safety-btn safety-btn--outline"
							>
								<Copy className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
								1-Click в протокол 043/у
							</button>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onClose}
								className="safety-btn safety-btn--ghost"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleSave}
								className="safety-btn safety-btn--primary-red"
							>
								<Check className="w-4 h-4" />
								Сохранить анкету
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

PatientAnamnesisModal.displayName = "PatientAnamnesisModal";
