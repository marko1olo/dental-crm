/**
 * apps/web/src/components/billing/invoices/QuickCreateFormFields.tsx
 *
 * Form inputs for QuickCreateInvoiceModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";

interface QuickCreateFormFieldsProps {
	readonly newPatientName: string;
	readonly setNewPatientName: (v: string) => void;
	readonly newServiceName: string;
	readonly setNewServiceName: (v: string) => void;
	readonly newServicePriceRub: number;
	readonly setNewServicePriceRub: (v: number) => void;
	readonly newIsWarranty100: boolean;
	readonly currentDoctorName: string;
}

export const QuickCreateFormFields: React.FC<QuickCreateFormFieldsProps> = ({
	newPatientName,
	setNewPatientName,
	newServiceName,
	setNewServiceName,
	newServicePriceRub,
	setNewServicePriceRub,
	newIsWarranty100,
	currentDoctorName,
}) => {
	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<label htmlFor="input-new-invoice-patient" className="text-xs font-semibold text-[var(--muted,#64748b)]">
					ФИО Пациента <span className="text-red-500">*</span>
				</label>
				<input
					id="input-new-invoice-patient"
					type="text"
					required
					value={newPatientName}
					onChange={(e) => setNewPatientName(e.target.value)}
					placeholder="ФИО пациента"
					data-testid="input-new-invoice-patient"
					className="h-10 w-full px-3 text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500"
				/>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="input-new-invoice-service" className="text-xs font-semibold text-[var(--muted,#64748b)]">
					Наименование услуги
				</label>
				<input
					id="input-new-invoice-service"
					type="text"
					value={newServiceName}
					onChange={(e) => setNewServiceName(e.target.value)}
					placeholder="Стоматологический прием и лечение"
					data-testid="input-new-invoice-service"
					className="h-10 w-full px-3 text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500"
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<label htmlFor="input-new-invoice-price" className="text-xs font-semibold text-[var(--muted,#64748b)]">
						Сумма к оплате, ₽
					</label>
					<input
						id="input-new-invoice-price"
						type="number"
						min={0}
						step="1"
						disabled={newIsWarranty100}
						value={newIsWarranty100 ? 0 : newServicePriceRub}
						onChange={(e) => setNewServicePriceRub(Math.max(0, parseFloat(e.target.value) || 0))}
						data-testid="input-new-invoice-price"
						className="h-10 w-full px-3 font-mono font-bold text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500 disabled:opacity-50"
					/>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="input-new-invoice-doctor" className="text-xs font-semibold text-[var(--muted,#64748b)]">
						Лечащий врач
					</label>
					<input
						id="input-new-invoice-doctor"
						type="text"
						readOnly
						value={currentDoctorName}
						className="h-10 w-full px-3 text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] outline-none"
					/>
				</div>
			</div>
		</div>
	);
};
