import { ReceiptText, X } from "lucide-react";
import type React from "react";
import { ServiceFormMetaFields } from "../ServiceFormMetaFields";
import type { PriceItemEditModalProps } from "./types";

export function PriceItemEditModal({
	isOpen,
	isNew,
	editServiceForm,
	setEditServiceForm,
	priceRubInput,
	setPriceRubInput,
	priceProblem,
	setPriceProblem,
	isSaving,
	serviceCategoryLabels,
	specialtyLabels,
	onClose,
	onSave,
}: PriceItemEditModalProps) {
	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			tabIndex={-1}
			className="premium-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (
					e.target === e.currentTarget &&
					(e.key === "Enter" || e.key === " ")
				) {
					onClose();
				}
			}}
		>
			<div className="premium-modal-content w-full max-w-lg rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				<div className="premium-modal-header px-5 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--paper-soft)]">
					<div
						style={{ display: "flex", alignItems: "center", gap: "12px" }}
					>
						<ReceiptText size={22} className="text-[var(--teal)] shrink-0" />
						<h3 className="text-base font-bold text-[var(--ink)] m-0">
							{isNew ? "Новая услуга" : "Редактировать услугу"}
						</h3>
					</div>
					<button
						type="button"
						className="premium-modal-close p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
						onClick={onClose}
					>
						<X size={18} />
					</button>
				</div>

				<form onSubmit={onSave} className="premium-modal-body p-5 space-y-4 overflow-y-auto flex flex-col">
					<div className="staff-form-group full-width">
						<label htmlFor="service-title-input">Название услуги</label>
						<input
							id="service-title-input"
							type="text"
							value={editServiceForm.title}
							onChange={(e) =>
								setEditServiceForm({
									...editServiceForm,
									title: e.target.value,
								})
							}
							required
							placeholder="Например: Первичная консультация врача-терапевта"
						/>
					</div>

					<div className="staff-form-grid">
						<div className="staff-form-group">
							<label htmlFor="service-code-input">
								Код услуги / Артикул
							</label>
							<input
								id="service-code-input"
								type="text"
								value={editServiceForm.code}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										code: e.target.value,
										order804nCode: editServiceForm.order804nCode || e.target.value,
									})
								}
								placeholder="Например: ТЕР-01 или A16.07.002"
							/>
						</div>
						<div className="staff-form-group">
							<label htmlFor="service-price-input">Цена (₽)</label>
							<input
								id="service-price-input"
								type="text"
								inputMode="decimal"
								value={priceRubInput}
								onChange={(e) => {
									setPriceRubInput(e.target.value);
									setPriceProblem(null);
								}}
								placeholder="например 1500 или 1500,50"
								required
							/>
							{priceProblem && (
								<small
									style={{ color: "var(--danger-color)", marginTop: "4px" }}
								>
									{priceProblem}
								</small>
							)}
						</div>
					</div>

					<div className="staff-form-grid">
						<div className="staff-form-group">
							<label htmlFor="service-materials-cost-input">
								Себестоимость расходных материалов (₽)
							</label>
							<input
								id="service-materials-cost-input"
								type="number"
								min="0"
								step="0.01"
								value={editServiceForm.materialsCostRub ?? 0}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										materialsCostRub: Number.parseFloat(e.target.value) || 0,
									})
								}
								placeholder="0"
							/>
						</div>
						<div className="staff-form-group">
							<label htmlFor="service-order804n-input">
								Номенклатурный шифр (для справок)
							</label>
							<input
								id="service-order804n-input"
								type="text"
								value={editServiceForm.order804nCode ?? editServiceForm.code}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										order804nCode: e.target.value,
									})
								}
								placeholder="Опционально"
							/>
						</div>
					</div>

					<ServiceFormMetaFields
						editServiceForm={editServiceForm}
						setEditServiceForm={setEditServiceForm}
						serviceCategoryLabels={serviceCategoryLabels || {}}
						specialtyLabels={specialtyLabels || {}}
					/>

					<div className="premium-modal-footer px-5 py-3.5 border-t border-[var(--line)] flex items-center justify-end gap-2.5 bg-[var(--paper-soft)]">
						<button
							type="button"
							className="secondary-button"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="primary-button"
							disabled={isSaving}
							aria-busy={isSaving}
						>
							{isSaving ? "Сохранение..." : "Сохранить"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export const PriceItemModal = PriceItemEditModal;
