import { X } from "lucide-react";
import React from "react";
import { PricelistServiceFormBasicFields } from "./PricelistServiceFormBasicFields";
import { PricelistServiceFormFooter } from "./PricelistServiceFormFooter";
import { PricelistServiceFormIcdFields } from "./PricelistServiceFormIcdFields";
import type { PricelistServiceFormModalProps } from "./PricelistServiceFormModalProps";
import { PricelistServiceFormPriceFields } from "./PricelistServiceFormPriceFields";
import { PricelistServiceFormTierFields } from "./PricelistServiceFormTierFields";
import { usePricelistServiceForm } from "./usePricelistServiceForm";

export type { PricelistServiceFormModalProps };

export const PricelistServiceFormModal: React.FC<
	PricelistServiceFormModalProps
> = ({ isOpen, editingItem, onClose, onSave }) => {
	const form = usePricelistServiceForm(editingItem, isOpen, onSave);
	if (!isOpen) return null;

	return (
		<div
			className="pricelist-modal-overlay pricelist-bottom-sheet-overlay"
			style={{ zIndex: 10005 }}
			role="dialog"
			aria-modal="true"
		>
			<div
				className="pricelist-modal-container pricelist-service-form-sheet"
				style={{ maxWidth: "640px", width: "100%" }}
			>
				<div className="pricelist-bottom-sheet-handle-bar">
					<div className="pricelist-bottom-sheet-drag-handle" />
				</div>

				<header className="pricelist-modal-header">
					<div className="pricelist-header-left">
						<div className="pricelist-header-title">
							{editingItem
								? "Редактирование услуги"
								: "Добавление услуги в прейскурант"}
						</div>
					</div>
					<button
						type="button"
						className="pricelist-btn pricelist-btn-icon"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</header>

				<form onSubmit={form.handleSubmit} className="pricelist-service-form">
					<div
						className="pricelist-form-body"
						style={{
							padding: "1.25rem",
							display: "flex",
							flexDirection: "column",
							gap: "0.75rem",
						}}
					>
						<PricelistServiceFormBasicFields
							code={form.formStatutoryCode}
							commercialTitle={form.formCommercialTitle}
							statutoryTitle={form.formStatutoryTitle}
							category={form.formCategory}
							specialty={form.formSpecialty}
							onCodeChange={form.handleCodeChange}
							onCommercialTitleChange={form.setFormCommercialTitle}
							onStatutoryTitleChange={form.setFormStatutoryTitle}
							onCategoryChange={form.setFormCategory}
							onSpecialtyChange={form.setFormSpecialty}
						/>

						<PricelistServiceFormPriceFields
							priceRub={form.formPriceRub}
							materialCostRub={form.formMaterialCostRub}
							labCostRub={form.formLabCostRub}
							durationMin={form.formDurationMin}
							onPriceChange={form.handleBasePriceChange}
							onMaterialCostChange={form.setFormMaterialCostRub}
							onLabCostChange={form.setFormLabCostRub}
							onDurationChange={form.setFormDurationMin}
						/>

						<PricelistServiceFormTierFields
							showTiers={form.showTiersSection}
							vipPrice={form.formVipPrice}
							dmsPrice={form.formDmsPrice}
							promoPrice={form.formPromoPrice}
							nightPrice={form.formNightPrice}
							onToggleShowTiers={() =>
								form.setShowTiersSection((prev) => !prev)
							}
							onVipPriceChange={form.setFormVipPrice}
							onDmsPriceChange={form.setFormDmsPrice}
							onPromoPriceChange={form.setFormPromoPrice}
							onNightPriceChange={form.setFormNightPrice}
							onAutoRecalculate={form.handleAutoRecalculateTiers}
						/>

						<PricelistServiceFormIcdFields
							icd10={form.formIcd10}
							onIcd10Change={form.setFormIcd10}
						/>
					</div>

					<PricelistServiceFormFooter
						isEditing={Boolean(editingItem)}
						onClose={onClose}
					/>
				</form>
			</div>
		</div>
	);
};
