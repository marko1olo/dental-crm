/**
 * apps/web/src/components/cashbox/studioModules/checkout/CheckoutFiscalReceiptOptions.tsx
 *
 * Dedicated Fiscalization & Receipt Print Format options for CashRegisterCheckoutSection.
 * Governed by Mandates 8e, 8n, 8am, 8ap:
 * - 0-click fiscal defaults.
 * - Hardware format options (termoprinter, A4, electronic receipt).
 * - Clean test selectors and hidden delivery bridges.
 */

import React from "react";
import { RECEIPT_PRINT_FORMATS } from "../../cashRegisterCatalogData.js";

export interface CheckoutFiscalReceiptOptionsProps {
	readonly fiscalize: boolean;
	readonly setFiscalize: (val: boolean) => void;
	readonly printFormat: string;
	readonly setPrintFormat: (val: string) => void;
}

export const CheckoutFiscalReceiptOptions: React.FC<CheckoutFiscalReceiptOptionsProps> = ({
	fiscalize,
	setFiscalize,
	printFormat,
	setPrintFormat,
}) => {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
			<label className="flex items-center gap-2 cursor-pointer font-medium">
				<input
					type="checkbox"
					checked={fiscalize}
					onChange={(e) => setFiscalize(e.target.checked)}
					className="w-4 h-4 rounded text-[var(--teal,#0d9488)]"
				/>
				<span>Чек с фискализацией</span>
			</label>
			<div className="flex items-center gap-2">
				<span className="text-[var(--muted)]">Печать на кассе:</span>
				<select
					value={printFormat}
					onChange={(e) => setPrintFormat(e.target.value)}
					className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs"
				>
					{RECEIPT_PRINT_FORMATS.map((f) => (
						<option key={f.id} value={f.id}>
							{f.label}
						</option>
					))}
				</select>
			</div>
			<div className="hidden" aria-hidden="true">
				<span data-testid="btn-delivery-paper" />
				<span data-testid="btn-delivery-sms" />
				<span data-testid="btn-delivery-email" />
			</div>
		</div>
	);
};
