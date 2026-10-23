/**
 * MarketingCampaignHeader.tsx — Top Bar of Campaign Detail Workspace.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e & 8am (Consistent Design System).
 */

import React, { useState } from "react";
import { Clock, Copy, Check } from "lucide-react";
import type { MarketingPromo } from "./marketingTypes";
import { showToast } from "../GlobalToast";

export interface MarketingCampaignHeaderProps {
	readonly promo: MarketingPromo;
	readonly onTogglePromoStatus: (promoId: string) => void;
}

export const MarketingCampaignHeader: React.FC<MarketingCampaignHeaderProps> = ({
	promo,
	onTogglePromoStatus,
}) => {
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const handleCopyPromoCode = () => {
		navigator.clipboard?.writeText(promo.promoCode);
		setIsCopied(true);
		showToast(`Промокод «${promo.promoCode}» скопирован в буфер обмена`, "info");
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<div className="marketing-workspace-header">
			<div className="marketing-workspace-header__main">
				<div className="flex items-center gap-2 flex-wrap mb-1">
					<span className="marketing-badge-category">{promo.category}</span>
					<span className="marketing-badge-validity">
						<Clock size={11} className="inline mr-1" />
						до {promo.validUntil}
					</span>
					<span
						className={`marketing-status-pill ${
							promo.status === "active"
								? "marketing-status-pill--active"
								: "marketing-status-pill--archived"
						}`}
					>
						{promo.status === "active" ? "Активна в клинике" : "В архиве"}
					</span>
				</div>
				<h3 className="marketing-workspace-title">{promo.title}</h3>
				<p className="marketing-workspace-desc">{promo.description}</p>
			</div>

			<div className="marketing-workspace-header__actions">
				<div className="marketing-code-box">
					<span className="marketing-code-label">Промокод</span>
					<div className="marketing-code-value-wrap">
						<strong className="marketing-code-value">{promo.promoCode}</strong>
						<button
							type="button"
							className="marketing-copy-btn"
							onClick={handleCopyPromoCode}
							title="Скопировать промокод"
							aria-label="Скопировать промокод"
							data-testid="btn-copy-promo"
						>
							{isCopied ? (
								<Check size={14} className="text-[var(--primary)]" />
							) : (
								<Copy size={14} />
							)}
						</button>
					</div>
				</div>

				<button
					type="button"
					className="secondary-button marketing-toggle-status-btn min-h-[36px]"
					onClick={() => onTogglePromoStatus(promo.id)}
					data-testid="btn-toggle-promo-status"
				>
					{promo.status === "active" ? "Приостановить" : "Активировать"}
				</button>
			</div>
		</div>
	);
};
