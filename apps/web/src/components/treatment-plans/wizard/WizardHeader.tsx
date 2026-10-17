import React from "react";
import { Layers, X } from "lucide-react";

export interface WizardHeaderProps {
	readonly patientName?: string | undefined;
	readonly itemsCount: number;
	readonly onClose: () => void;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({ patientName, itemsCount, onClose }) => {
	return (
		<div className="flex items-center justify-between p-4 border-b border-[var(--line)] bg-[var(--paper-strong)]">
			<div className="flex items-center gap-3">
				<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
					<Layers size={20} />
				</div>
				<div>
					<h3 className="text-base font-bold text-[var(--ink)] m-0">Составление плана лечения</h3>
					<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
						Пациент: <span className="font-semibold text-[var(--ink)]">{patientName || "Без имени"}</span> · Найдено услуг: {itemsCount}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
				aria-label="Закрыть"
			>
				<X size={18} />
			</button>
		</div>
	);
};
