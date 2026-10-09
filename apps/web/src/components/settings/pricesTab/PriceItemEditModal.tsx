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
			className="premium-modal-overlay"
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
			<div className="premium-modal-content" style={{ maxWidth: "520px" }}>
				<div className="premium-modal-header">
					<div
						style={{ display: "flex", alignItems: "center", gap: "12px" }}
					>
						<ReceiptText size={24} color="var(--teal)" />
						<h3>
							{isNew ? "Новая услуга" : "Редактировать услугу"}
						</h3>
					</div>
					<button
						type="button"
						className="premium-modal-close"
						onClick={onClose}
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={onSave} className="premium-modal-body">
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
								Код услуги (внутренний или официальный)
							</label>
							<input
								id="service-code-input"
								type="text"
								value={editServiceForm.code}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										code: e.target.value,
									})
								}
								placeholder="A16.07.002"
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

					<ServiceFormMetaFields
						editServiceForm={editServiceForm}
						setEditServiceForm={setEditServiceForm}
						serviceCategoryLabels={serviceCategoryLabels}
						specialtyLabels={specialtyLabels}
					/>

					<div className="premium-modal-footer">
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
