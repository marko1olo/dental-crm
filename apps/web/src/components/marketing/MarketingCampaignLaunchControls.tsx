/**
 * MarketingCampaignLaunchControls.tsx
 *
 * Compliance Consent Checkbox & Estimated Budget Calculator.
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";

interface MarketingCampaignLaunchControlsProps {
	consentOnly: boolean;
	onChangeConsentOnly: (val: boolean) => void;
	estimatedCostRub: string;
	activeSegmentCount: number;
	channelRateRub: number;
}

export function MarketingCampaignLaunchControls({
	consentOnly,
	onChangeConsentOnly,
	estimatedCostRub,
	activeSegmentCount,
	channelRateRub,
}: MarketingCampaignLaunchControlsProps) {
	return (
		<div className="marketing-launch-controls">
			<label className="marketing-compliance-checkbox">
				<input
					type="checkbox"
					checked={consentOnly}
					onChange={(e) => onChangeConsentOnly(e.target.checked)}
					className="marketing-checkbox-input"
				/>
				<ShieldCheck size={15} className="text-[var(--primary)] shrink-0" aria-hidden="true" />
				<span className="marketing-compliance-text">
					Только пациенты с подтвержденным согласием на сервисные и рекламные сообщения
				</span>
			</label>

			<div className="marketing-budget-calc">
				<span className="marketing-budget-label">Расчетный бюджет:</span>
				<strong className="marketing-budget-value">{estimatedCostRub} ₽</strong>
				<span className="marketing-budget-sub">
					({activeSegmentCount} получателей × {channelRateRub.toFixed(2)} ₽)
				</span>
			</div>
		</div>
	);
}
