/**
 * TreatmentPlansDoctorDiscountModal.tsx — Модалка скидок лечащего врача (0% - 100%).
 * Мандат 8e: Автономия врача — свобода скидок до 100% на гарантийные переделки без мастер-паролей.
 * Мандаты 8b, 8zi: Декомпозиция монолита TreatmentPlansTab.tsx по протоколу /decomposer.
 */

import React, { useState, useEffect } from "react";
import { Percent, X, CheckCircle2 } from "lucide-react";

export interface TreatmentPlansDoctorDiscountModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly currentDiscountPercent: number;
	readonly onApplyDiscount: (percent: number) => void;
}

const DISCOUNT_PRESETS = [
	{ percent: 0, label: "0% — Базовая" },
	{ percent: 5, label: "5% — Семейная" },
	{ percent: 10, label: "10% — Постоянный" },
	{ percent: 15, label: "15% — Выходной день" },
	{ percent: 20, label: "20% — Комплекс" },
	{ percent: 50, label: "50% — Персонал" },
	{ percent: 100, label: "100% — Гарантия" },
] as const;

export const TreatmentPlansDoctorDiscountModal: React.FC<TreatmentPlansDoctorDiscountModalProps> = ({
	isOpen,
	onClose,
	currentDiscountPercent,
	onApplyDiscount,
}) => {
	const [tempDiscountPercent, setTempDiscountPercent] = useState<number>(currentDiscountPercent);

	useEffect(() => {
		if (isOpen) {
			setTempDiscountPercent(currentDiscountPercent);
		}
	}, [isOpen, currentDiscountPercent]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="discounts-modal-title"
			data-testid="doctor-discounts-modal"
		>
			<div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl p-5 space-y-4">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))]">
							<Percent className="w-4 h-4" />
						</div>
						<div>
							<h3 id="discounts-modal-title" className="text-sm font-bold m-0 text-[var(--ink)]">
								Скидка лечащего врача
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Автономия врача: от 0% до 100% без паролей администратора
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border-0 bg-transparent cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="space-y-3">
					<div className="text-xs font-semibold text-[var(--muted)]">
						Клинические пресеты скидок:
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{DISCOUNT_PRESETS.map((preset) => (
							<button
								key={preset.percent}
								type="button"
								onClick={() => setTempDiscountPercent(preset.percent)}
								data-testid={`discount-preset-${preset.percent}`}
								className={`min-h-[40px] px-3 py-2 text-xs font-bold rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
									tempDiscountPercent === preset.percent
										? "border-[var(--teal,var(--brand-primary))] bg-[var(--teal)]/10 text-[var(--ink)] ring-1 ring-[var(--teal)]/40"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)]"
								}`}
							>
								<span>{preset.label}</span>
							</button>
						))}
					</div>

					<div className="pt-2">
						<label htmlFor="custom-discount-input" className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
							Произвольный процент скидки:
						</label>
						<div className="flex items-center gap-2">
							<input
								id="custom-discount-input"
								type="number"
								min={0}
								max={100}
								value={tempDiscountPercent}
								onChange={(e) => {
									const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
									setTempDiscountPercent(val);
								}}
								data-testid="input-custom-discount"
								className="flex-1 min-h-[40px] px-3 text-sm font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
							<span className="text-sm font-bold text-[var(--muted)]">%</span>
						</div>
					</div>

					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] text-[var(--muted)] leading-relaxed">
						ℹ️ Врач имеет право применить скидку до 100% на гарантийные переделки и коррекцию работы без задержек и ввода мастер-паролей.
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
					<button
						type="button"
						onClick={() => {
							onApplyDiscount(0);
							onClose();
						}}
						className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
						data-testid="btn-reset-discount"
					>
						Сбросить
					</button>
					<button
						type="button"
						onClick={() => {
							onApplyDiscount(tempDiscountPercent);
							onClose();
						}}
						className="primary-button min-h-[40px] px-5 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
						data-testid="btn-apply-discount"
					>
						<CheckCircle2 className="w-3.5 h-3.5" />
						<span>Применить ({tempDiscountPercent}%)</span>
					</button>
				</div>
			</div>
		</div>
	);
};
