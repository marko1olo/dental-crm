import { FileText, RotateCcw, Save } from "lucide-react";
import React, { useId } from "react";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export interface SomaticNotesAndActionsProps {
	readonly isCompact?: boolean;
	readonly profile: PatientClinicalSafetyProfile;
	readonly setProfile: React.Dispatch<React.SetStateAction<PatientClinicalSafetyProfile>>;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onSyncToDiary: () => void;
	readonly onSave: () => void;
}

export const SomaticNotesAndActions: React.FC<SomaticNotesAndActionsProps> = ({
	isCompact = false,
	profile,
	setProfile,
	onApplyPhysiologicalNorm,
	onSyncToDiary,
	onSave,
}) => {
	const customNotesId = useId();

	return (
		<>
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

			<div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex-wrap">
				<button
					type="button"
					onClick={onApplyPhysiologicalNorm}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8 min-h-[32px] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					title="Сбросить все риски до физиологической нормы"
				>
					<RotateCcw className="w-3.5 h-3.5" />
					<span>Сброс в норму</span>
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onSyncToDiary}
						className="inline-flex items-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
						data-testid="sync-diary-btn"
						title="Перенести текущую формулировку в дневник приёма"
					>
						<FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>В дневник приёма</span>
					</button>

					<button
						type="button"
						onClick={onSave}
						className="inline-flex items-center gap-1.5 px-4 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-xs transition-all cursor-pointer active:scale-98"
						data-testid="save-somatic-btn"
						title="Сохранить соматический профиль пациента"
					>
						<Save className="w-4 h-4" />
						<span>Сохранить статус</span>
					</button>
				</div>
			</div>
		</>
	);
};
