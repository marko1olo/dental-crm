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
			<span className="vde-043__badge vde-043__badge--revise">
				<AlertTriangle className="w-4 h-4" /> ПРАВКА
			</span>
		);
	}
	return (
		<div className="flex items-center gap-1.5">
			<span className="vde-043__badge vde-043__badge--locked">
				<Lock className="w-4 h-4" /> ПОДПИСАНО
			</span>
			<button
				type="button"
				id="diary-top-revise-btn"
				data-testid="diary-top-revise-btn"
				onClick={beginRevise}
				className="vde-043__btn vde-043__btn--amber text-xs py-1 px-2.5 font-bold flex items-center gap-1"
				title="Внести исправление в закрытый дневник («Исправленному верить»)"
			>
				<FileText className="w-3.5 h-3.5" /> Внести исправление («Исправленному верить»)
			</button>
		</div>
	);
};
