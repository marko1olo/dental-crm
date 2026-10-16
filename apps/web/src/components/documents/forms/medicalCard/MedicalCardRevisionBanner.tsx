import React from "react";
import { FileEdit } from "lucide-react";

export interface MedicalCardRevisionBannerProps {
	revisionReason: string;
	setRevisionReason: (val: string) => void;
	onSaveRevision: () => void;
	onCancelRevision: () => void;
}

const btnBaseClass = "inline-flex items-center justify-center min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border shadow-2xs transition-colors cursor-pointer";

export const MedicalCardRevisionBanner: React.FC<MedicalCardRevisionBannerProps> = React.memo(
	function MedicalCardRevisionBanner({
		revisionReason,
		setRevisionReason,
		onSaveRevision,
		onCancelRevision,
	}) {
		return (
			<div
				data-testid="form043-revision-banner"
				className="flex flex-wrap items-center justify-between gap-3 p-3 mb-3.5 rounded-lg border border-amber-500/35 bg-amber-500/10 dark:bg-amber-950/20"
			>
				<div className="flex items-center gap-2">
					<FileEdit className="w-4 h-4 text-amber-600 shrink-0" />
					<div>
						<strong className="text-xs font-bold text-amber-800 dark:text-amber-400">
							Режим ревизии («Исправленному верить»):
						</strong>
						<span className="text-xs text-[var(--ink)] ml-1.5 opacity-90">
							Правки вносятся лечащим врачом с сохранением истории ревизий.
						</span>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<input
						type="text"
						data-testid="input-043-revision-reason"
						value={revisionReason}
						onChange={(e) => setRevisionReason(e.target.value)}
						placeholder="Причина правки (по умолчанию: Исправленному верить)"
						className="min-w-[220px] px-2.5 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					/>
					<button
						type="button"
						data-testid="btn-043-save-revision"
						className={`${btnBaseClass} border-[var(--teal)] bg-[var(--teal)] text-white hover:bg-[var(--teal-hover,var(--teal))]`}
						onClick={onSaveRevision}
					>
						Зафиксировать ревизию
					</button>
					<button
						type="button"
						data-testid="btn-043-cancel-revision"
						className={`${btnBaseClass} border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)]`}
						onClick={onCancelRevision}
					>
						Отменить правку
					</button>
				</div>
			</div>
		);
	},
);
