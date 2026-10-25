import { FileText } from "lucide-react";
import React from "react";

export interface FastCheckoutLegalEntityFieldsProps {
	readonly buyerInn: string;
	readonly setBuyerInn: (val: string) => void;
	readonly buyerName: string;
	readonly setBuyerName: (val: string) => void;
}

export const FastCheckoutLegalEntityFields: React.FC<
	FastCheckoutLegalEntityFieldsProps
> = ({ buyerInn, setBuyerInn, buyerName, setBuyerName }) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
			<div className="space-y-1">
				<span className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1">
					<FileText size={12} className="text-teal-600" />
					<span>ИНН организации / ИП (10 или 12 цифр): *</span>
				</span>
				<input
					type="text"
					maxLength={12}
					value={buyerInn}
					onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
					placeholder="ИНН (10 или 12 цифр)"
					className="min-h-[44px] sm:min-h-0 sm:h-8 w-full px-2.5 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
					data-testid="input-buyer-inn-legal"
				/>
			</div>
			<div className="space-y-1">
				<span className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1">
					<span>Наименование организации / ИП:</span>
				</span>
				<input
					type="text"
					value={buyerName}
					onChange={(e) => setBuyerName(e.target.value)}
					placeholder="ООО «Компания» или ИП Иванов"
					className="min-h-[44px] sm:min-h-0 sm:h-8 w-full px-2.5 text-xs bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
					data-testid="input-buyer-name-legal"
				/>
			</div>
		</div>
	);
};
