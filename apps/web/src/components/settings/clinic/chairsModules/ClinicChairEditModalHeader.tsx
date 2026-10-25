import React from "react";
import { X } from "lucide-react";

interface ClinicChairEditModalHeaderProps {
	color: string;
	onClose: () => void;
}

export const ClinicChairEditModalHeader: React.FC<ClinicChairEditModalHeaderProps> = ({
	color,
	onClose,
}) => {
	return (
		<div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
			<div className="flex items-center gap-2.5">
				<span
					className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
					style={{ backgroundColor: color }}
				/>
				<h3 id="chair-edit-modal-title" className="text-base font-bold text-[var(--ink)] m-0">
					Параметры кресла
				</h3>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
				aria-label="Закрыть"
			>
				<X size={18} />
			</button>
		</div>
	);
};
