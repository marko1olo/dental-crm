import React from "react";
import { Award, Clock, DollarSign, Phone } from "lucide-react";

export interface CuratorCardAttentionBadgesProps {
	readonly flags: readonly string[];
}

export const CuratorCardAttentionBadges: React.FC<CuratorCardAttentionBadgesProps> = ({ flags }) => {
	if (!flags || flags.length === 0) return null;

	return (
		<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
			{flags.includes("stagnant_plan") && (
				<span className="curator-kpi-badge curator-badge-amber">
					<Clock className="w-3 h-3" /> Застрял на этапе &gt; нормы
				</span>
			)}
			{flags.includes("high_value_plan") && (
				<span className="curator-kpi-badge curator-badge-purple">
					<Award className="w-3 h-3" /> Крупная смета &gt; 150к
				</span>
			)}
			{flags.includes("pending_prepayment") && (
				<span className="curator-kpi-badge curator-badge-amber">
					<DollarSign className="w-3 h-3" /> Ожидает аванс
				</span>
			)}
			{flags.includes("requires_followup_call") && (
				<span className="curator-kpi-badge curator-badge-blue">
					<Phone className="w-3 h-3" /> Нужен звонок
				</span>
			)}
		</div>
	);
};
