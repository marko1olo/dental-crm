import React from "react";
import { Check } from "lucide-react";

interface MobilePriceRegulatoryCardProps {
	taxDeductible: boolean;
	setTaxDeductible: (val: boolean) => void;
	vatRate: "vat_exempt" | "vat_20";
	setVatRate: (val: "vat_exempt" | "vat_20") => void;
}

export const MobilePriceRegulatoryCard: React.FC<MobilePriceRegulatoryCardProps> = ({
	taxDeductible,
	setTaxDeductible,
	vatRate,
	setVatRate,
}) => {
	return (
		<div className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
			<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
				Налоговый и фискальный статус
			</span>

			<label className="flex items-center justify-between cursor-pointer select-none">
				<div className="flex flex-col pr-2">
					<span className="text-[14px] font-medium text-[var(--ink)]">
						Налоговый вычет (справка ФНС)
					</span>
					<span className="text-[12px] text-[var(--muted)]">
						Включать в справку об оплате медицинских услуг для вычета 13%
					</span>
				</div>
				<input
					type="checkbox"
					checked={taxDeductible}
					onChange={(e) => setTaxDeductible(e.target.checked)}
					className="w-5 h-5 rounded accent-[var(--teal)] cursor-pointer shrink-0"
				/>
			</label>

			<div className="h-px bg-[var(--line)]" />

			<div className="space-y-1.5">
				<span className="text-[13px] font-medium text-[var(--ink)] block">
					Ставка НДС (ст. 149 НК РФ)
				</span>
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setVatRate("vat_exempt")}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
							vatRate === "vat_exempt"
								? "bg-[var(--teal-soft)] border-[var(--teal)] text-[var(--teal-dark)] font-semibold"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)]"
						}`}
					>
						<div
							className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
								vatRate === "vat_exempt"
									? "border-[var(--teal)] bg-[var(--teal)] text-white"
									: "border-[var(--line)]"
							}`}
						>
							{vatRate === "vat_exempt" && <Check size={10} />}
						</div>
						<span className="text-xs">Без НДС (ст. 149)</span>
					</button>

					<button
						type="button"
						onClick={() => setVatRate("vat_20")}
						className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
							vatRate === "vat_20"
								? "bg-[var(--teal-soft)] border-[var(--teal)] text-[var(--teal-dark)] font-semibold"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)]"
						}`}
					>
						<div
							className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
								vatRate === "vat_20"
									? "border-[var(--teal)] bg-[var(--teal)] text-white"
									: "border-[var(--line)]"
							}`}
						>
							{vatRate === "vat_20" && <Check size={10} />}
						</div>
						<span className="text-xs">НДС 20%</span>
					</button>
				</div>
			</div>
		</div>
	);
};
