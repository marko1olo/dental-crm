import React, { useState, useEffect } from "react";
import { Receipt, X, Sparkles, Plus } from "lucide-react";
import { showToast } from "../GlobalToast.js";

export interface QuickCreateInvoiceModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	currentDoctorName: string;
	onCreateInvoice: (params: {
		patientName: string;
		serviceName: string;
		servicePriceRub: number;
		isWarranty100: boolean;
	}) => void;
}

export const QuickCreateInvoiceModal: React.FC<QuickCreateInvoiceModalProps> = ({
	isOpen,
	onClose,
	patientName,
	currentDoctorName,
	onCreateInvoice,
}) => {
	const [newPatientName, setNewPatientName] = useState<string>(patientName || "");
	const [newServiceName, setNewServiceName] = useState<string>("");
	const [newServicePriceRub, setNewServicePriceRub] = useState<number>(5000);
	const [newIsWarranty100, setNewIsWarranty100] = useState<boolean>(false);

	useEffect(() => {
		if (patientName) {
			setNewPatientName(patientName);
		}
	}, [patientName]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newPatientName.trim()) {
			showToast("Введите ФИО пациента для создания счета", "warning");
			return;
		}

		onCreateInvoice({
			patientName: newPatientName.trim(),
			serviceName: newServiceName.trim(),
			servicePriceRub: newServicePriceRub,
			isWarranty100: newIsWarranty100,
		});

		setNewPatientName(patientName || "");
		setNewServiceName("");
		setNewServicePriceRub(5000);
		setNewIsWarranty100(false);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-invoice-title"
		>
			<div className="w-full max-w-lg rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col">
				{/* Header */}
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<h3
						id="create-invoice-title"
						className="text-base font-bold flex items-center gap-2 m-0"
					>
						<Receipt size={18} className="text-teal-600" />
						<span>Быстрое создание счета (1 клик)</span>
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9 w-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
						aria-label="Закрыть окно создания счета"
					>
						<X size={18} />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					{/* 1-Click Fast Presets (Mandate 8e: Doctor Autonomy) */}
					<div className="space-y-1.5">
						<div className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
							<Sparkles size={13} className="text-amber-500" />
							<span>Быстрые пресеты услуг:</span>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={() => {
									setNewServiceName(
										"Первичный осмотр + Компьютерная томография (КЛКТ)",
									);
									setNewServicePriceRub(3500);
									setNewIsWarranty100(false);
								}}
								className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-xs font-medium cursor-pointer"
							>
								Осмотр + КЛКТ (3 500 ₽)
							</button>
							<button
								type="button"
								onClick={() => {
									setNewServiceName(
										"Профессиональная гигиена полости рта (GBT)",
									);
									setNewServicePriceRub(10000);
									setNewIsWarranty100(false);
								}}
								className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-xs font-medium cursor-pointer"
							>
								Профгигиена GBT (10 000 ₽)
							</button>
							<button
								type="button"
								onClick={() => {
									setNewServiceName("Лечение глубокого кариеса с пломбой");
									setNewServicePriceRub(6500);
									setNewIsWarranty100(false);
								}}
								className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-xs font-medium cursor-pointer"
							>
								Кариес (6 500 ₽)
							</button>
							<button
								type="button"
								onClick={() => {
									setNewServiceName("Гарантийная переделка реставрации");
									setNewServicePriceRub(0);
									setNewIsWarranty100(true);
								}}
								className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold cursor-pointer"
							>
								Гарантия 100% (0 ₽)
							</button>
						</div>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="input-new-invoice-patient"
							className="text-xs font-semibold text-[var(--muted,#64748b)]"
						>
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
						<label
							htmlFor="input-new-invoice-service"
							className="text-xs font-semibold text-[var(--muted,#64748b)]"
						>
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
							<label
								htmlFor="input-new-invoice-price"
								className="text-xs font-semibold text-[var(--muted,#64748b)]"
							>
								Сумма к оплате, ₽
							</label>
							<input
								id="input-new-invoice-price"
								type="number"
								min={0}
								step="1"
								disabled={newIsWarranty100}
								value={newIsWarranty100 ? 0 : newServicePriceRub}
								onChange={(e) =>
									setNewServicePriceRub(
										Math.max(0, parseFloat(e.target.value) || 0),
									)
								}
								data-testid="input-new-invoice-price"
								className="h-10 w-full px-3 font-mono font-bold text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500 disabled:opacity-50"
							/>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="input-new-invoice-doctor"
								className="text-xs font-semibold text-[var(--muted,#64748b)]"
							>
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

					<div className="pt-2 flex items-center justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
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
