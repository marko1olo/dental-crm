import type React from "react";
import { ShieldCheck } from "lucide-react";
import { LOYALTY_EXCLUSION_RULES } from "../../loyaltyPresets";

export const LoyaltyExclusionsCallout: React.FC = () => {
	return (
		<div className="loyalty-exclusion-callout">
			<h5
				style={{
					fontSize: "0.875rem",
					fontWeight: 700,
					color: "var(--warn-fg)",
					display: "flex",
					alignItems: "center",
					gap: "0.375rem",
					marginBottom: "0.5rem",
				}}
			>
				<ShieldCheck size={18} />
				Официальные правила исключений из бонусной программы
			</h5>
			<ul
				style={{
					margin: 0,
					paddingLeft: "1.25rem",
					fontSize: "0.8125rem",
					color: "var(--ink)",
					lineHeight: 1.6,
				}}
			>
				{LOYALTY_EXCLUSION_RULES.map((rule) => (
					<li key={rule.id}>
						<strong>{rule.categoryNameRu}:</strong> {rule.reasonRu}
					</li>
				))}
			</ul>
		</div>
	);
};
