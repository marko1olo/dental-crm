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
		<header className="mdlp-modal-header">
			<div className="mdlp-modal-title" id="mdlp-act-title">
				<FileText size={24} className="text-[var(--teal,#0d9488)] shrink-0" />
				<div className="min-w-0">
					<div className="font-bold text-lg leading-tight truncate">
						{approverRole === "senior_nurse"
							? "Акт списания медикаментов и анестетиков (Старшая медсестра)"
							: "Акт списания медикаментов и анестетиков"}
					</div>
					<div className="text-xs text-muted mt-0.5 truncate">
						СанПиН 3.3686-21 • Честный ЗНАК (Схема 10560) • Позиций: {itemsCount}
					</div>
				</div>
			</div>
			<button
				type="button"
				className="mdlp-btn mdlp-btn-ghost p-2"
				onClick={onClose}
				aria-label="Закрыть окно"
			>
				<X size={20} />
			</button>
		</header>
	);
};
