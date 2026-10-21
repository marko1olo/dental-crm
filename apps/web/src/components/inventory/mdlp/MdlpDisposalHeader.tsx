import { PackageCheck, X } from "lucide-react";
import React from "react";

export interface MdlpDisposalHeaderProps {
	readonly onClose: () => void;
}

export const MdlpDisposalHeader: React.FC<MdlpDisposalHeaderProps> = ({ onClose }) => {
	return (
		<header className="mdlp-modal-header">
			<div className="mdlp-modal-title" id="mdlp-queue-title">
				<PackageCheck size={26} className="text-[var(--teal,#0d9488)] shrink-0" />
				<div className="min-w-0">
					<div className="font-bold text-lg leading-tight truncate">
						Списание анестетиков и медикаментов в Честный ЗНАК (МДЛП Схема 10560)
					</div>
					<div className="text-xs text-muted mt-0.5 flex items-center gap-2 truncate">
						<span>Вывод из оборота (код 13)</span> • <span>Контроль сроков годности FEFO</span> • <span>Акт списания</span>
					</div>
				</div>
			</div>
			<button
				type="button"
				className="mdlp-btn mdlp-btn-ghost p-2 min-h-[44px] min-w-[44px]"
				style={{ minHeight: "44px", minWidth: "44px" }}
				onClick={onClose}
				aria-label="Закрыть окно"
				data-testid="header-close-btn"
			>
				<X size={20} />
			</button>
		</header>
	);
};
