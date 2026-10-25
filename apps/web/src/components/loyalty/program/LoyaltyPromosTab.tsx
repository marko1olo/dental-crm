import type React from "react";
import { Tag } from "lucide-react";
import type { evaluatePromoCode } from "./loyaltyEngine";
import { PROMO_CODE_PRESETS } from "./loyaltyPresets";
import { LoyaltyPromoCard } from "./tabs/promos/LoyaltyPromoCard";
import { LoyaltyPromoEvaluatorBox } from "./tabs/promos/LoyaltyPromoEvaluatorBox";
import { LoyaltyExclusionsCallout } from "./tabs/promos/LoyaltyExclusionsCallout";

export interface LoyaltyPromosTabProps {
	readonly promoInput: string;
	readonly onPromoInputChange: (input: string) => void;
	readonly promoResult: ReturnType<typeof evaluatePromoCode> | null;
	readonly onEvaluatePromo: () => void;
	readonly onApplyPromoDirectly: (code: string) => void;
	readonly onApplyPromoResultToInvoice: () => void;
}

export const LoyaltyPromosTab: React.FC<LoyaltyPromosTabProps> = (p) => {
	return (
		<div>
			<h4 className="loyalty-section-title">
				<Tag size={20} color="var(--teal)" />
				Каталог маркетинговых промокодов клиники
			</h4>

			<div className="loyalty-promo-grid">
				{PROMO_CODE_PRESETS.map((promo) => (
					<LoyaltyPromoCard
						key={promo.code}
						promo={promo}
						onApplyPromoDirectly={p.onApplyPromoDirectly}
					/>
				))}
			</div>

			<LoyaltyPromoEvaluatorBox
				promoInput={p.promoInput}
				onPromoInputChange={p.onPromoInputChange}
				promoResult={p.promoResult}
				onEvaluatePromo={p.onEvaluatePromo}
				onApplyPromoResultToInvoice={p.onApplyPromoResultToInvoice}
			/>

			<LoyaltyExclusionsCallout />
		</div>
	);
};
