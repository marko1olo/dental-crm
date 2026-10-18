/**
 * apps/web/src/components/billing/QuickCreateInvoiceModal.tsx
 *
 * Fast Invoice Creation Modal with 1-click clinical presets.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React, { useState, useEffect } from "react";
import { Receipt, X, Plus } from "lucide-react";
import { showToast } from "../GlobalToast.js";
import { QuickCreatePresets } from "./invoices/QuickCreatePresets.js";
import { QuickCreateFormFields } from "./invoices/QuickCreateFormFields.js";

export interface QuickCreateInvoiceModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	currentDoctorName: string;
	catalogServices?: readonly { code804n?: string; name: string; priceRub: number }[];
	onCreateInvoice: (params: { patientName: string; serviceName: string; servicePriceRub: number; isWarranty100: boolean }) => void;
}

export const QuickCreateInvoiceModal: React.FC<QuickCreateInvoiceModalProps> = ({
	isOpen, onClose, patientName, currentDoctorName, catalogServices, onCreateInvoice,
}) => {
	const [newPatientName, setNewPatientName] = useState<string>(patientName || "");
	const [newServiceName, setNewServiceName] = useState<string>("");
	const [newServicePriceRub, setNewServicePriceRub] = useState<number>(5000);
	const [newIsWarranty100, setNewIsWarranty100] = useState<boolean>(false);

	useEffect(() => {
		if (patientName) setNewPatientName(patientName);
	}, [patientName]);

	if (!isOpen) return null;

	const handleSelectPreset = (serviceName: string, priceRub: number, isWarranty: boolean) => {
		setNewServiceName(serviceName);
		setNewServicePriceRub(priceRub);
		setNewIsWarranty100(isWarranty);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newPatientName.trim()) {
			showToast("Введите ФИО пациента для создания счета", "warning");
			return;
		}
		onCreateInvoice({ patientName: newPatientName.trim(), serviceName: newServiceName.trim(), servicePriceRub: newServicePriceRub, isWarranty100: newIsWarranty100 });
		setNewPatientName(patientName || "");
		setNewServiceName("");
		setNewServicePriceRub(5000);
		setNewIsWarranty100(false);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog" aria-modal="true" aria-labelledby="create-invoice-title"
		>
			<div className="w-full max-w-lg rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col">
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<h3 id="create-invoice-title" className="text-base font-bold flex items-center gap-2 m-0">
						<Receipt size={18} className="text-teal-600" />
						<span>Создать счет</span>
					</h3>
					<button
						type="button" onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9 w-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
						aria-label="Закрыть окно создания счета"
					>
						<X size={18} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					<QuickCreatePresets catalogServices={catalogServices} onSelectPreset={handleSelectPreset} />
					<QuickCreateFormFields
						newPatientName={newPatientName} setNewPatientName={setNewPatientName}
						newServiceName={newServiceName} setNewServiceName={setNewServiceName}
						newServicePriceRub={newServicePriceRub} setNewServicePriceRub={setNewServicePriceRub}
						newIsWarranty100={newIsWarranty100} currentDoctorName={currentDoctorName}
					/>
					<div className="pt-2 flex items-center justify-end gap-2">
						<button
							type="button" onClick={onClose}
							className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
							data-testid="btn-new-invoice-submit"
						>
							<Plus size={14} />
							<span>Создать счет</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default QuickCreateInvoiceModal;
