/**
 * MarketingNewPromoModal.tsx — Single-Surface Modal for creating a new promotion.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, Mandate 8am (Unified Design System).
 */

import React from "react";
import { X, Sparkles } from "lucide-react";
import type { MarketingPromo } from "./marketingTypes";
import { MarketingNewPromoForm } from "./MarketingNewPromoForm";

export interface MarketingNewPromoModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSave: (promo: MarketingPromo) => void;
}

export const MarketingNewPromoModal: React.FC<MarketingNewPromoModalProps> = ({
	isOpen,
	onClose,
	onSave,
}) => {
	if (!isOpen) return null;

	return (
		<div className="marketing-modal-backdrop" onClick={onClose} role="presentation">
			<div
				className="marketing-modal-content"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="new-promo-modal-title"
				data-testid="new-promo-modal"
			>
				<div className="marketing-modal-header">
					<div className="flex items-center gap-2">
						<Sparkles size={18} className="text-teal" aria-hidden="true" />
						<h3 id="new-promo-modal-title" className="marketing-modal-title">
							Новая маркетинговая акция
						</h3>
					</div>
					<button
						type="button"
						className="marketing-modal-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<MarketingNewPromoForm onSave={onSave} onClose={onClose} />
			</div>
		</div>
	);
};
