/**
 * OmnichannelNpsTab.tsx — Тонкий координатор дашборда NPS и триажа отзывов.
 * Строго <= 120 строк по Мандату 8b.
 */

import React from "react";
import { OmnichannelNpsMetricsCards } from "./OmnichannelNpsMetricsCards.js";
import { OmnichannelNpsTable, type OmnichannelNpsTableProps } from "./OmnichannelNpsTable.js";
import type { NpsMetrics } from "../omnichannelTypes.js";

export interface OmnichannelNpsTabProps extends OmnichannelNpsTableProps {
	readonly npsMetrics: NpsMetrics;
}

export const OmnichannelNpsTab: React.FC<OmnichannelNpsTabProps> = ({
	npsMetrics,
	npsReviews,
	filteredNpsReviews,
	npsFilterUrgency,
	setNpsFilterUrgency,
	npsFilterStatus,
	setNpsFilterStatus,
	onUpdateNpsStatus,
	onOpenChatFromNps,
}) => {
	return (
		<div className="hub-nps-workspace">
			<OmnichannelNpsMetricsCards npsMetrics={npsMetrics} />
			<OmnichannelNpsTable
				npsReviews={npsReviews}
				filteredNpsReviews={filteredNpsReviews}
				npsFilterUrgency={npsFilterUrgency}
				setNpsFilterUrgency={setNpsFilterUrgency}
				npsFilterStatus={npsFilterStatus}
				setNpsFilterStatus={setNpsFilterStatus}
				onUpdateNpsStatus={onUpdateNpsStatus}
				onOpenChatFromNps={onOpenChatFromNps}
			/>
		</div>
	);
};
