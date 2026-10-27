import React from "react";
import { CheckCircle2, Loader2, XCircle, Zap } from "lucide-react";
import type { DoctorSpecialtyKey } from "../../../store/doctorPreferencesStore";
import type { ClinicalRolePreset } from "../workspaceRolePresetTypes";

export interface ClinicalRoleSpotlightCardProps {
	readonly activePreset: ClinicalRolePreset;
	readonly currentDoctorSpecialty?: DoctorSpecialtyKey | null | undefined;
	readonly applyingPreset: boolean;
	readonly presetFeedback: string | null;
	readonly failureText?: string | null | undefined;
	readonly onApplyPreset: (preset: ClinicalRolePreset) => void;
}

export function ClinicalRoleSpotlightCard({
	activePreset,
	currentDoctorSpecialty,
	applyingPreset,
	presetFeedback,
	failureText,
	onApplyPreset,
}: ClinicalRoleSpotlightCardProps) {
	return (
		<div
			className="p-4 rounded-xl border transition-all bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-950/80 shadow-xs"
			style={{ borderColor: `${activePreset.color}66` }}
			data-testid="clinical-role-spotlight-card"
		>
			<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
				<div>
					<div className="flex items-center gap-2 mb-1 flex-wrap">
						<span
							className="text-xs font-bold px-2 py-0.5 rounded-full"
							style={{
								background: `${activePreset.color}20`,
								color: activePreset.color,
							}}
						>
							{activePreset.badge}
						</span>
						<h4 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
							{activePreset.title}
						</h4>
						{currentDoctorSpecialty === activePreset.key && (
							<span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
								<CheckCircle2 size={13} /> Активна
							</span>
						)}
					</div>
					<p className="m-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
						{activePreset.description}
					</p>
					<p className="m-0 mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
						Фокус: {activePreset.clinicalFocus}
					</p>
				</div>

				<button
					type="button"
					data-testid="apply-clinical-role-preset-btn"
					onClick={() => onApplyPreset(activePreset)}
					disabled={applyingPreset}
					className="primary-button flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 self-start sm:self-center transition-all cursor-pointer shadow-xs hover:shadow-sm"
					style={{
						minHeight: "44px",
						background: "var(--teal, #0d9488)",
						color: "#ffffff",
					}}
				>
					{applyingPreset ? (
						<Loader2 size={16} className="animate-spin" />
					) : (
						<Zap size={16} />
					)}
					<span>Применить профиль: {activePreset.shortTitle}</span>
				</button>
			</div>

			{presetFeedback && (
				<div
					data-testid="role-preset-feedback"
					className="p-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-medium"
				>
					<CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
					<span>{presetFeedback}</span>
				</div>
			)}

			{failureText && (
				<div
					role="alert"
					className="p-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-medium"
				>
					<XCircle size={14} className="shrink-0 text-rose-500" />
					<span>{failureText}</span>
				</div>
			)}
		</div>
	);
}
