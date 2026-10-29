import type React from "react";
import { AlertTriangle, FileText, Lock } from "lucide-react";

export interface VisitDiaryHeaderLockBadgeProps {
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
}

export const VisitDiaryHeaderLockBadge: React.FC<VisitDiaryHeaderLockBadgeProps> = ({
	isLocked,
	isRevising,
	beginRevise,
}) => {
	if (!isLocked) return null;
	if (isRevising) {
		return (
			<span className="clinical-diary__badge clinical-diary__badge--revise">
				<AlertTriangle className="w-4 h-4" /> ПРАВКА
			</span>
		);
	}
	return (
		<div className="flex items-center gap-1.5">
			<span className="clinical-diary__badge clinical-diary__badge--locked">
				<Lock className="w-4 h-4" /> ПОДПИСАНО
			</span>
			<button
				type="button"
				id="diary-top-revise-btn"
				data-testid="diary-top-revise-btn"
				onClick={beginRevise}
				className="clinical-diary__btn border border-amber-500/50 bg-amber-500/10 text-amber-500 dark:text-amber-300 text-xs py-1 px-2.5 font-bold flex items-center gap-1 rounded-lg hover:bg-amber-500/20 transition-colors"
				title="Внести исправление в закрытый дневник («Исправленному верить»)"
			>
				<FileText className="w-3.5 h-3.5" /> Внести исправление («Исправленному верить»)
			</button>
		</div>
	);
};
