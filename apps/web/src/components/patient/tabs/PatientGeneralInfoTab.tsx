import React, { useCallback, useMemo } from "react";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	HeartPulse,
	MapPin,
	Phone,
	Printer,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	User,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	evaluatePatientSafetyFlags,
} from "../safetyMath";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
} from "../PatientDetailModal";

export interface PatientGeneralInfo {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	gender?: "male" | "female" | string | null | undefined;
	address?: string | null | undefined;
	snils?: string | null | undefined;
	inn?: string | null | undefined;
	omsPolicyNumber?: string | null | undefined;
	notes?: string | null | undefined;
}

export interface PatientGeneralInfoTabProps {
	patient?: PatientGeneralInfo | null | undefined;
	safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: string) => void) | undefined;
	onUpdateSafetyProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	onApplySomaticNorm?: (() => void) | undefined;
	disabled?: boolean | undefined;
}

/**
 * PatientGeneralInfoTab — Вкладка общих сведений пациента и соматического статуса.
 *
 * МАНДАТ 8e п. 3: 1-клик кнопка «Соматически здоров / Физиологическая норма» (btn-somatic-healthy-norm).
 * Заполняет анамнез нормой по умолчанию. Врач правит только патологию!
 * МАНДАТ 8d п. 7: СТРОГО 0 эмодзи — исключительно векторные иконки Lucide.
 */
export const PatientGeneralInfoTab: React.FC<PatientGeneralInfoTabProps> = React.memo(
	function PatientGeneralInfoTab({
		patient,
		safetyProfile = DEFAULT_SOMATIC_HEALTHY_NORM,
		onUpdatePatient,
		onUpdateSafetyProfile,
		onApplySomaticNorm,
		disabled = false,
	}) {
		const currentProfile = safetyProfile ?? DEFAULT_SOMATIC_HEALTHY_NORM;
		const safetyEvaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(currentProfile);
		}, [currentProfile]);

		const handleApplyNorm = useCallback(() => {
			const cleanProfile = createHealthySomaticNormProfile();
			if (onUpdateSafetyProfile) {
				onUpdateSafetyProfile(cleanProfile);
			}
			if (onApplySomaticNorm) {
				onApplySomaticNorm();
			}
			showToast(
				"Установлена физиологическая норма: соматически здоров (1 клик)",
				"success",
				4000,
			);
		}, [onUpdateSafetyProfile, onApplySomaticNorm]);

		const handleToggleAllergy = useCallback(
			(field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => {
				if (disabled) return;
				const updated: PatientClinicalSafetyProfile = {
					...currentProfile,
					[field]: !currentProfile[field],
				};
				if (onUpdateSafetyProfile) {
					onUpdateSafetyProfile(updated);
				}
			},
			[currentProfile, disabled, onUpdateSafetyProfile],
		);

		return (
			<div className="patient-general-info-tab flex flex-col gap-5 p-4 bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800">
				{/* 1-Click Physiological Norm Action Banner (Mandate 8e item 3) */}
				<div className="flex items-center justify-between gap-3 p-3.5 bg-[var(--teal-surface,rgba(13,148,136,0.08))] dark:bg-teal-950/40 rounded-xl border border-[var(--teal-line,rgba(13,148,136,0.25))] flex-wrap">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--brand-primary,#0d9488)] text-white flex items-center justify-center shrink-0">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div>
							<div className="text-sm font-bold text-[var(--ink,#1e293b)] dark:text-slate-100 flex items-center gap-1.5">
								<span>Клиническая автономия врача (Мандат 8e)</span>
								<span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
									1 клик
								</span>
							</div>
							<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
								Физиологическая норма по умолчанию: соматически здоров, анамнез не отягощен. Врач правит только патологию!
							</div>
						</div>
					</div>

					<button
						type="button"
						data-testid="btn-somatic-healthy-norm"
						className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
						onClick={handleApplyNorm}
						disabled={disabled}
						title="Установить физиологическую норму в 1 клик (Мандат 8e)"
					>
						<CheckCircle2 className="w-4 h-4 shrink-0" />
						<span>Соматически здоров / Физиологическая норма</span>
					</button>
				</div>

				{/* Patient Identity & Contacts */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#1e293b)] dark:text-slate-200 flex items-center gap-1.5">
							<User className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
							<span>ФИО Пациента</span>
						</label>
						<input
							type="text"
							className="min-h-[44px] px-3 py-2 text-sm rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary,#0d9488)]"
							value={patient?.fullName ?? ""}
							onChange={(e) => onUpdatePatient?.("fullName", e.target.value)}
							placeholder="Фамилия Имя Отчество"
							disabled={disabled}
							data-testid="input-patient-fullname"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#1e293b)] dark:text-slate-200 flex items-center gap-1.5">
							<Phone className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
							<span>Телефон</span>
						</label>
						<input
							type="tel"
							className="min-h-[44px] px-3 py-2 text-sm rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary,#0d9488)]"
							value={patient?.phone ?? ""}
							onChange={(e) => onUpdatePatient?.("phone", e.target.value)}
							placeholder="+7 (___) ___-__-__"
							disabled={disabled}
							data-testid="input-patient-phone"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#1e293b)] dark:text-slate-200 flex items-center gap-1.5">
							<Calendar className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
							<span>Дата рождения</span>
						</label>
						<input
							type="date"
							className="min-h-[44px] px-3 py-2 text-sm rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary,#0d9488)]"
							value={patient?.birthDate ?? ""}
							onChange={(e) => onUpdatePatient?.("birthDate", e.target.value)}
							disabled={disabled}
							data-testid="input-patient-birthdate"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#1e293b)] dark:text-slate-200 flex items-center gap-1.5">
							<MapPin className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
							<span>Адрес регистрации / проживания</span>
						</label>
						<input
							type="text"
							className="min-h-[44px] px-3 py-2 text-sm rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary,#0d9488)]"
							value={patient?.address ?? ""}
							onChange={(e) => onUpdatePatient?.("address", e.target.value)}
							placeholder="г. Москва, ул. ..."
							disabled={disabled}
							data-testid="input-patient-address"
						/>
					</div>
				</div>

				{/* Somatic Safety Profile & Allergy Chips */}
				<div className="p-4 bg-[var(--paper-soft,rgba(0,0,0,0.02))] dark:bg-slate-900/60 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-2">
							<HeartPulse className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							<span className="font-bold text-xs text-[var(--ink,#1e293b)] dark:text-slate-100">
								Аллергологический статус и стоп-факторы:
							</span>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<span
								data-testid="somatic-status-badge"
								className={`text-xs px-2.5 py-1 rounded-md font-bold inline-flex items-center gap-1 ${
									safetyEvaluation.hasCriticalStopFlags
										? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
										: safetyEvaluation.hasHighRiskFlags
											? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
											: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
								}`}
							>
								{safetyEvaluation.hasCriticalStopFlags ? (
									<>
										<AlertTriangle className="w-3 h-3 text-rose-600" />
										<span>Стоп-факторы</span>
									</>
								) : safetyEvaluation.hasHighRiskFlags ? (
									<>
										<AlertTriangle className="w-3 h-3 text-amber-600" />
										<span>Повышенный риск</span>
									</>
								) : (
									<>
										<CheckCircle2 className="w-3 h-3 text-emerald-600" />
										<span>Физиологическая норма</span>
									</>
								)}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2 flex-wrap mt-1">
						<button
							type="button"
							data-testid="toggle-allergy-penicillin"
							className={`min-h-[40px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
								currentProfile.hasPenicillinAllergy
									? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700"
									: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] dark:bg-slate-800 dark:border-slate-700"
							}`}
							onClick={() => handleToggleAllergy("hasPenicillinAllergy")}
							disabled={disabled}
						>
							<ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
							<span>Пенициллины {currentProfile.hasPenicillinAllergy ? "(Аллергия)" : "(Норма)"}</span>
						</button>

						<button
							type="button"
							data-testid="toggle-allergy-nsaid"
							className={`min-h-[40px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
								currentProfile.hasNsaidAllergy
									? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700"
									: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] dark:bg-slate-800 dark:border-slate-700"
							}`}
							onClick={() => handleToggleAllergy("hasNsaidAllergy")}
							disabled={disabled}
						>
							<ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
							<span>НПВП / Аспирин {currentProfile.hasNsaidAllergy ? "(Аллергия)" : "(Норма)"}</span>
						</button>

						<button
							type="button"
							data-testid="toggle-allergy-latex"
							className={`min-h-[40px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
								currentProfile.hasLatexAllergy
									? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700"
									: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] dark:bg-slate-800 dark:border-slate-700"
							}`}
							onClick={() => handleToggleAllergy("hasLatexAllergy")}
							disabled={disabled}
						>
							<ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
							<span>Латекс {currentProfile.hasLatexAllergy ? "(Аллергия)" : "(Норма)"}</span>
						</button>
					</div>

					<div className="mt-2">
						<label className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-400 block mb-1">
							Соматический анамнез (Anamnesis Vitae):
						</label>
						<textarea
							className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary,#0d9488)]"
							rows={2}
							value={currentProfile.customChronicNotes ?? ""}
							onChange={(e) => {
								if (onUpdateSafetyProfile) {
									onUpdateSafetyProfile({
										...currentProfile,
										customChronicNotes: e.target.value,
									});
								}
							}}
							placeholder="Соматически здоров. Аллергический статус не отягощен..."
							disabled={disabled}
							data-testid="textarea-somatic-notes"
						/>
					</div>
				</div>
			</div>
		);
	},
);

export default PatientGeneralInfoTab;
