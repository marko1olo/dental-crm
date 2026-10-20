import React from "react";
import type { PayerLegalType, InnValidationResult } from "../types.js";

export interface CashboxPayerTypeRowProps {
	readonly payerType: PayerLegalType;
	readonly setPayerType: (type: PayerLegalType) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (inn: string) => void;
	readonly innValidation: InnValidationResult;
}

export function CashboxPayerTypeRow({
	payerType,
	setPayerType,
	buyerInn,
	setBuyerInn,
	innValidation,
}: CashboxPayerTypeRowProps): React.JSX.Element {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
			<div>
				<label className="block text-xs font-medium text-[var(--muted)] mb-1">
					Тип плательщика
				</label>
				<div className="flex gap-2">
					<button
						type="button"
						className={`flex-1 h-9 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
							payerType === "physical_person"
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
						}`}
						onClick={() => setPayerType("physical_person")}
					>
						Физическое лицо (без ИНН)
					</button>
					<button
						type="button"
						className={`flex-1 h-9 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
							payerType === "legal_entity"
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
						}`}
						onClick={() => setPayerType("legal_entity")}
					>
						Юрлицо (ИНН 10 цифр)
					</button>
				</div>
			</div>

			<div>
				<label htmlFor="cashbox-inn-input" className="block text-xs font-medium text-[var(--muted)] mb-1">
					ИНН плательщика {payerType === "physical_person" ? "(опционально)" : "(обязательно)"}
				</label>
				<input
					id="cashbox-inn-input"
					type="text"
					value={buyerInn}
					onChange={(e) => setBuyerInn(e.target.value)}
					placeholder={
						payerType === "physical_person"
							? "Не требуется для оплаты (только для справки 13% НДФЛ)"
							: "10 или 12 цифр"
					}
					className="w-full h-9 text-xs px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,var(--brand-primary))]"
				/>
				{innValidation.errorRu && (
					<p className="text-[11px] text-[var(--warning-fg)] mt-1">{innValidation.errorRu}</p>
				)}
			</div>
		</div>
	);
}
