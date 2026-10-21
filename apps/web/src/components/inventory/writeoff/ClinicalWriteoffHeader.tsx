import { PackageCheck, X } from "lucide-react";
import React from "react";

export interface ClinicalWriteoffHeaderProps {
	readonly onClose: () => void;
}

export const ClinicalWriteoffHeader: React.FC<ClinicalWriteoffHeaderProps> = ({ onClose }) => {
	return (
		<header className="cw-modal-header">
			<div className="cw-modal-title" id="cw-modal-title">
				<PackageCheck size={26} className="text-teal-600 shrink-0" />
				<div className="min-w-0">
					<div className="font-bold text-lg leading-tight truncate">Клиническое списание материалов</div>
					<div className="text-xs font-normal text-muted flex items-center gap-2 mt-0.5 truncate">
						<span>Клинические нормы</span> • <span>Партии по срокам</span> • <span>Акты списания</span>
					</div>
				</div>
			</div>
			<button
				type="button"
				className="cw-btn cw-btn-ghost p-2"
				onClick={onClose}
				aria-label="Закрыть окно автосписания"
			>
				<X size={20} />
			</button>
		</header>
	);
};
