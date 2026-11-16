import { FileText, X } from "lucide-react";
import React from "react";

export interface SeniorNurseDisposalActHeaderProps {
	readonly approverRole: string;
	readonly itemsCount: number;
	readonly onClose: () => void;
}

export const SeniorNurseDisposalActHeader: React.FC<SeniorNurseDisposalActHeaderProps> = ({
	approverRole,
	itemsCount,
	onClose,
}) => {
	return (
		<header className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0">
			<div className="flex items-center gap-3 min-w-0" id="mdlp-act-title">
				<FileText size={22} className="text-[var(--primary)] shrink-0" />
				<div className="min-w-0">
					<div className="font-bold text-base leading-tight truncate">
						{approverRole === "senior_nurse"
							? "Акт списания медикаментов и анестетиков (Старшая медсестра)"
							: "Акт списания медикаментов и анестетиков"}
					</div>
					<div className="text-xs text-[var(--muted)] mt-0.5 truncate">
						Санитарные нормы • Учет маркированных препаратов • Позиций: {itemsCount}
						<span className="sr-only">СанПиН 3.3686-21 • Честный ЗНАК (Схема 10560)</span>
					</div>
				</div>
			</div>
			<button
				type="button"
				className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
				onClick={onClose}
				aria-label="Закрыть окно"
			>
				<X size={20} />
			</button>
		</header>
	);
};

export default SeniorNurseDisposalActHeader;
