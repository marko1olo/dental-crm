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
					className="text-xs font-medium text-[var(--ink-muted)]"
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
					className="w-full p-2.5 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all resize-y"
					data-testid="somatic-notes-textarea"
				/>
			</div>

			<div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--line)] flex-wrap">
				<button
					type="button"
					onClick={onApplyPhysiologicalNorm}
					className="inline-flex items-center gap-1.5 px-3.5 h-11 sm:h-8 min-h-[44px] sm:min-h-[32px] rounded-xl text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
					title="Сбросить все риски до физиологической нормы"
				>
					<RotateCcw className="w-3.5 h-3.5 shrink-0" />
					<span>Сброс в норму</span>
				</button>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={onSyncToDiary}
						className="inline-flex items-center gap-1.5 px-3.5 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] rounded-xl text-xs font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
						data-testid="sync-diary-btn"
						title="Перенести текущую формулировку в дневник приёма"
					>
						<FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>В дневник приёма</span>
					</button>

					<button
						type="button"
						onClick={onSave}
						className="inline-flex items-center gap-1.5 px-4 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs transition-all cursor-pointer active:scale-98 shrink-0"
						data-testid="save-somatic-btn"
						title="Сохранить соматический профиль пациента"
					>
						<Save className="w-4 h-4 shrink-0" />
						<span>Сохранить статус</span>
					</button>
				</div>
			</div>
		</>
	);
};
