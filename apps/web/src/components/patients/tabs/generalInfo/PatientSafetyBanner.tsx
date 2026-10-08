import React, { useMemo } from "react";
import {
	AlertTriangle,
	CheckCircle2,
	HeartPulse,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
} from "../../safetyMath";
import { SomaticAnamnesisCard } from "../../../clinical/SomaticAnamnesisCard";
import type { PatientSafetyBannerProps } from "./types";

export const PatientSafetyBanner: React.FC<PatientSafetyBannerProps> = React.memo(
	function PatientSafetyBanner({
		currentProfile,
		disabled = false,
		mode = "compact",
		patientId,
		patientName,
		onToggleAllergy,
		onApplySomaticNorm,
		onUpdateSafetyProfile,
	}) {
		const safetyEvaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(currentProfile);
		}, [currentProfile]);

		const handleApplyNormAction = () => {
			if (disabled) return;
			if (onApplySomaticNorm) {
				onApplySomaticNorm();
			} else if (onUpdateSafetyProfile) {
				onUpdateSafetyProfile({
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					customChronicNotes:
						"Соматически здоров. Аллергоанамнез не отягощен. Инфекционные заболевания отрицает. Физиологическая норма.",
				});
			}
		};

		if (mode === "full") {
			return (
				<div className="flex flex-col gap-5 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] shadow-xs">
					<div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)] flex-wrap gap-2">
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
								<HeartPulse className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-sm font-black m-0 text-[var(--ink)]">
									Медицинский статус, соматика и аллергологический анамнез
								</h3>
								<p className="text-[11px] text-[var(--muted)] m-0">
									Клинические стоп-факторы, аллергии на медикаменты и оценка анестезиологического риска
								</p>
							</div>
						</div>

						{/* 1-Click Соматическая норма (Мандат 8e п. 3) */}
						<button
							type="button"
							data-testid="btn-somatic-healthy-norm"
							onClick={handleApplyNormAction}
							disabled={disabled}
							className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all active:scale-98 shrink-0 select-none"
							title="Зафиксировать физиологическую норму: соматически здоров"
						>
							<ShieldCheck className="w-4 h-4 shrink-0" />
							<span>Норма</span>
						</button>
					</div>

					{/* Экспресс-оценка безопасности и аллергий */}
					<div className="p-4 bg-[var(--paper-soft)] rounded-xl border border-[var(--glass-border)] flex flex-col gap-3">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-2">
								<HeartPulse className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
								<span className="font-bold text-xs text-[var(--ink)]">
									Аллергологический статус и стоп-факторы:
								</span>
							</div>
							<span
								data-testid="somatic-status-badge"
								className={`text-xs px-2.5 py-1 rounded-md font-bold inline-flex items-center gap-1 border border-[var(--glass-border)] bg-[var(--paper-strong)] ${
									safetyEvaluation.hasCriticalStopFlags
										? "text-rose-600 dark:text-rose-400 border-rose-500/30"
										: safetyEvaluation.hasHighRiskFlags
											? "text-amber-600 dark:text-amber-400 border-amber-500/30"
											: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
								}`}
							>
								{safetyEvaluation.hasCriticalStopFlags ? (
									<>
										<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
										<span>Стоп-факторы</span>
									</>
								) : safetyEvaluation.hasHighRiskFlags ? (
									<>
										<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
										<span>Повышенный риск</span>
									</>
								) : (
									<>
										<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
										<span>Физиологическая норма</span>
									</>
								)}
							</span>
						</div>

						<div className="flex items-center gap-2 flex-wrap mt-1">
							<button
								type="button"
								data-testid="toggle-allergy-penicillin"
								className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
									currentProfile.hasPenicillinAllergy
										? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
										: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
								}`}
								onClick={() => onToggleAllergy("hasPenicillinAllergy")}
								disabled={disabled}
							>
								{currentProfile.hasPenicillinAllergy ? (
									<ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
								) : (
									<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
								)}
								<span>Пенициллины {currentProfile.hasPenicillinAllergy ? "(Аллергия)" : "(Норма)"}</span>
							</button>

							<button
								type="button"
								data-testid="toggle-allergy-nsaid"
								className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
									currentProfile.hasNsaidAllergy
										? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
										: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
								}`}
								onClick={() => onToggleAllergy("hasNsaidAllergy")}
								disabled={disabled}
							>
								{currentProfile.hasNsaidAllergy ? (
									<ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
								) : (
									<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
								)}
								<span>НПВП / Аспирин {currentProfile.hasNsaidAllergy ? "(Аллергия)" : "(Норма)"}</span>
							</button>

							<button
								type="button"
								data-testid="toggle-allergy-latex"
								className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
									currentProfile.hasLatexAllergy
										? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40"
										: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
								}`}
								onClick={() => onToggleAllergy("hasLatexAllergy")}
								disabled={disabled}
							>
								{currentProfile.hasLatexAllergy ? (
									<ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
								) : (
									<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
								)}
								<span>Латекс {currentProfile.hasLatexAllergy ? "(Аллергия)" : "(Норма)"}</span>
							</button>
						</div>

						<div className="mt-1">
							<label className="text-xs font-bold text-[var(--muted)] block mb-1">
								Соматический анамнез:
							</label>
							<textarea
								className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
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

					{/* Развернутый соматический опросник SomaticAnamnesisCard */}
					<div className="pt-2">
						<SomaticAnamnesisCard
							initialProfile={currentProfile}
							patientId={patientId || undefined}
							patientName={patientName || undefined}
							onApplyNorm={(normProfile) => {
								onUpdateSafetyProfile?.(normProfile);
								onApplySomaticNorm?.();
							}}
							onSave={(updatedProfile) => {
								onUpdateSafetyProfile?.(updatedProfile);
							}}
						/>
					</div>
				</div>
			);
		}

		// Mode: compact (для базовой карточки)
		return (
			<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--glass-border)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<HeartPulse className="w-3.5 h-3.5 text-[var(--teal)]" />
						<span className="font-bold text-xs text-[var(--ink)]">
							Экспресс-соматика и аллергии:
						</span>
					</div>
					<div className="flex items-center gap-2">
						<span
							data-testid="somatic-status-badge"
							className={`text-[11px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 border border-[var(--glass-border)] bg-[var(--paper-strong)] ${
								safetyEvaluation.hasCriticalStopFlags
									? "text-rose-600 dark:text-rose-400 border-rose-500/30"
									: safetyEvaluation.hasHighRiskFlags
										? "text-amber-600 dark:text-amber-400 border-amber-500/30"
										: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
							}`}
						>
							{safetyEvaluation.hasCriticalStopFlags ? (
								<>
									<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
									<span>Стоп-факторы</span>
								</>
							) : safetyEvaluation.hasHighRiskFlags ? (
								<>
									<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
									<span>Повышенный риск</span>
								</>
							) : (
								<>
									<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
									<span>Норма</span>
								</>
							)}
						</span>
						{(safetyEvaluation.hasCriticalStopFlags || safetyEvaluation.hasHighRiskFlags) && (
							<button
								type="button"
								data-testid="btn-somatic-healthy-norm"
								onClick={handleApplyNormAction}
								disabled={disabled}
								className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-[11px] rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-98 shrink-0 select-none"
								title="Зафиксировать физиологическую норму: соматически здоров"
							>
								<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
								<span>Норма</span>
							</button>
						)}
					</div>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						data-testid="toggle-allergy-penicillin"
						className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
							currentProfile.hasPenicillinAllergy
								? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold"
								: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
						onClick={() => onToggleAllergy("hasPenicillinAllergy")}
						disabled={disabled}
					>
						{currentProfile.hasPenicillinAllergy ? (
							<ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
						) : (
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
						)}
						<span>Пенициллины {currentProfile.hasPenicillinAllergy ? "(Аллергия)" : "(Норма)"}</span>
					</button>

					<button
						type="button"
						data-testid="toggle-allergy-nsaid"
						className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
							currentProfile.hasNsaidAllergy
								? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold"
								: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
						onClick={() => onToggleAllergy("hasNsaidAllergy")}
						disabled={disabled}
					>
						{currentProfile.hasNsaidAllergy ? (
							<ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
						) : (
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
						)}
						<span>НПВП / Аспирин {currentProfile.hasNsaidAllergy ? "(Аллергия)" : "(Норма)"}</span>
					</button>

					<button
						type="button"
						data-testid="toggle-allergy-latex"
						className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
							currentProfile.hasLatexAllergy
								? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold"
								: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
						onClick={() => onToggleAllergy("hasLatexAllergy")}
						disabled={disabled}
					>
						{currentProfile.hasLatexAllergy ? (
							<ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
						) : (
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
						)}
						<span>Латекс {currentProfile.hasLatexAllergy ? "(Аллергия)" : "(Норма)"}</span>
					</button>
				</div>
			</div>
		);
	},
);

export default PatientSafetyBanner;
