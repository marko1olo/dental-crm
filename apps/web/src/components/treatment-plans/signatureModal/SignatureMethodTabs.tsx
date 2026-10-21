import React from "react";
import { Printer, QrCode, Smartphone } from "lucide-react";
import type { TreatmentPlanSignMethod } from "./types";

export interface SignatureMethodTabsProps {
	readonly signMethod: TreatmentPlanSignMethod;
	readonly onSelectMethod: (method: TreatmentPlanSignMethod) => void;
}

export const SignatureMethodTabs: React.FC<SignatureMethodTabsProps> = ({
	signMethod,
	onSelectMethod,
}) => {
	return (
		<div className="space-y-1.5">
			<span className="text-xs font-bold text-[var(--ink)]">
				Выберите способ утверждения согласия:
			</span>
			<div className="grid grid-cols-3 p-1 rounded-2xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--border,#cbd5e1)] gap-1">
				<button
					type="button"
					onClick={() => onSelectMethod("sms")}
					className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
						signMethod === "sms"
							? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal-dark,var(--teal,#0d9488))] shadow-xs"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink)]"
					}`}
					data-testid="signature-method-sms"
				>
					<Smartphone size={16} />
					<span>СМС-код (ПЭП)</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectMethod("qr")}
					className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
						signMethod === "qr"
							? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal-dark,var(--teal,#0d9488))] shadow-xs"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink)]"
					}`}
					data-testid="signature-method-qr"
				>
					<QrCode size={16} />
					<span>QR на смартфон</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectMethod("paper")}
					className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
						signMethod === "paper"
							? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal-dark,var(--teal,#0d9488))] shadow-xs"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink)]"
					}`}
					data-testid="signature-method-paper"
				>
					<Printer size={16} />
					<span>На бумаге (А4)</span>
				</button>
			</div>
		</div>
	);
};
