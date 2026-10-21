import { GitMerge, Loader2 } from "lucide-react";
import type React from "react";

export interface DuplicateMergeFooterProps {
	readonly target: any;
	readonly isMerging: boolean;
	readonly onDismiss: () => void;
	readonly onClose: () => void;
	readonly onMerge: () => void;
}

export const DuplicateMergeFooter: React.FC<DuplicateMergeFooterProps> = ({
	target,
	isMerging,
	onDismiss,
	onClose,
	onMerge,
}) => {
	return (
		<div className="px-4 py-2.5 border-t border-[var(--line)] bg-[var(--paper-strong)] flex items-center justify-between gap-2 shrink-0">
			<div>
				{target && (
					<button
						type="button"
						onClick={onDismiss}
						className="h-8 px-2.5 rounded-lg border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] font-medium inline-flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
						data-testid="patient-duplicate-dismiss-btn"
					>
						<span>Это разные люди</span>
					</button>
				)}
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="h-8 px-3 rounded-lg border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold inline-flex items-center gap-1 cursor-pointer text-xs transition-colors"
					data-testid="patient-duplicate-cancel-btn"
				>
					<span>Закрыть</span>
				</button>
				{target && (
					<button
						type="button"
						onClick={onMerge}
						disabled={isMerging}
						className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 text-xs transition-all"
						data-testid="patient-duplicate-confirm-merge-btn"
					>
						{isMerging ? (
							<>
								<Loader2 size={13} className="animate-spin" />
								<span>Объединение...</span>
							</>
						) : (
							<>
								<GitMerge size={13} />
								<span>Объединить карточки</span>
							</>
						)}
					</button>
				)}
			</div>
		</div>
	);
};
