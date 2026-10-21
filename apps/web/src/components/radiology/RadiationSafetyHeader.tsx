import { ShieldCheck, X } from "lucide-react";
import type React from "react";

export interface RadiationSafetyHeaderProps {
	patientName: string;
	patientCardNumber: string;
	currentYear: number;
	onClose: () => void;
}

export const RadiationSafetyHeader: React.FC<RadiationSafetyHeaderProps> = ({
	patientName,
	patientCardNumber,
	currentYear,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600">
					<ShieldCheck className="w-4 h-4" />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)] leading-tight">
						Архив лучевой нагрузки пациента
					</h3>
					<p className="text-xs text-[var(--muted)]">
						{patientName} · Карта: {patientCardNumber} · {currentYear} год
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
				data-testid="btn-close-dose-registry"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
};
