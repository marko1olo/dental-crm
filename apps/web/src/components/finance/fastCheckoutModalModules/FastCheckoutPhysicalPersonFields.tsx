import { ShieldCheck } from "lucide-react";
import React from "react";

export interface FastCheckoutPhysicalPersonFieldsProps {
	readonly buyerInn: string;
	readonly setBuyerInn: (val: string) => void;
	readonly onInputEnterKeyDown?:
		| ((e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void)
		| undefined;
}

export const FastCheckoutPhysicalPersonFields: React.FC<
	FastCheckoutPhysicalPersonFieldsProps
> = ({ buyerInn, setBuyerInn, onInputEnterKeyDown }) => {
	return (
		<details className="group space-y-1" open={Boolean(buyerInn) || undefined}>
			<summary className="text-[11px] font-semibold text-[var(--muted,#64748b)] hover:text-teal-700 dark:hover:text-teal-400 cursor-pointer select-none list-none flex items-center gap-1 transition-colors">
				<span className="text-[10px] text-teal-600 font-bold group-open:rotate-90 transition-transform">
					▶
				</span>
				<span>Указать ИНН (опционально для 13% вычета НДФЛ)</span>
			</summary>
			<div className="pt-1 space-y-1">
				<input
					type="text"
					maxLength={12}
					value={buyerInn}
					onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
					onKeyDown={onInputEnterKeyDown}
					placeholder="Не требуется (пациент-физлицо)"
					className="min-h-[44px] sm:min-h-0 sm:h-8 w-full max-w-sm px-2.5 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
					data-testid="input-buyer-inn-physical"
				/>
				{buyerInn && buyerInn.length !== 12 && (
					<p className="text-[10px] text-amber-600 dark:text-amber-400 m-0 mt-0.5 flex items-center gap-1 font-medium">
						<ShieldCheck size={12} className="text-emerald-500 shrink-0" />
						<span>
							ИНН физлица обычно 12 цифр (для чека опционально, оплата не
							блокируется)
						</span>
					</p>
				)}
			</div>
		</details>
	);
};
