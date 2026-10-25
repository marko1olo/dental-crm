/**
 * apps/web/src/components/settings/mobile/MobilePriceDrawer.tsx
 *
 * Native iOS Bottom Sheet Drawer for Editing and Creating Pricelist Services.
 * Compliant with Apple Human Interface Guidelines (iOS HIG).
 * Facade <= 80 lines.
 */

import React from "react";
import { MobilePriceDrawerHeader } from "./MobilePriceDrawerHeader";
import { MobilePriceBasicInputs } from "./MobilePriceBasicInputs";
import { MobilePriceCategoryDurationInputs } from "./MobilePriceCategoryDurationInputs";
import { MobilePriceRegulatoryCard } from "./MobilePriceRegulatoryCard";
import { MobilePriceDrawerFooter } from "./MobilePriceDrawerFooter";
import { useMobilePriceDrawerForm } from "./useMobilePriceDrawerForm";
import type { MobilePriceDrawerProps } from "./mobilePriceDrawerConstants";

export type { MobilePriceDrawerProps } from "./mobilePriceDrawerConstants";

export const MobilePriceDrawer: React.FC<MobilePriceDrawerProps> = ({
	isOpen,
	onClose,
	service,
	onSave,
	onDelete,
	serviceCategoryLabels = {},
	specialtyLabels = {},
}) => {
	const {
		isNew, title, setTitle, code, setCode, priceInput, setPriceInput,
		category, setCategory, specialty, setSpecialty, durationMinutes, setDurationMinutes,
		taxDeductible, setTaxDeductible, vatRate, setVatRate, priceProblem, setPriceProblem,
		isSaving, isDeleting, handleSubmit, handleDelete,
	} = useMobilePriceDrawerForm({ isOpen, service, onSave, onDelete, onClose });

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mobile-price-drawer-title"
			data-testid="mobile-price-drawer"
		>
			<div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200" onClick={onClose} aria-hidden="true" />
			<div className="relative z-10 w-full max-h-[92dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl animate-in slide-in-from-bottom duration-250 overflow-hidden">
				<MobilePriceDrawerHeader isNew={isNew} code={code} onClose={onClose} />

				<form id="mobile-price-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain">
					<MobilePriceBasicInputs
						title={title}
						setTitle={setTitle}
						code={code}
						setCode={setCode}
						priceInput={priceInput}
						setPriceInput={setPriceInput}
						priceProblem={priceProblem}
						setPriceProblem={setPriceProblem}
					/>

					<MobilePriceCategoryDurationInputs
						category={category}
						setCategory={setCategory}
						specialty={specialty}
						setSpecialty={setSpecialty}
						durationMinutes={durationMinutes}
						setDurationMinutes={setDurationMinutes}
						serviceCategoryLabels={serviceCategoryLabels}
						specialtyLabels={specialtyLabels}
					/>

					<MobilePriceRegulatoryCard
						taxDeductible={taxDeductible}
						setTaxDeductible={setTaxDeductible}
						vatRate={vatRate}
						setVatRate={setVatRate}
					/>
				</form>

				<MobilePriceDrawerFooter
					isSaving={isSaving}
					isNew={isNew}
					isDeleting={isDeleting}
					onDelete={handleDelete}
				/>
			</div>
		</div>
	);
};

export default MobilePriceDrawer;
