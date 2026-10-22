import React from "react";
import type { EndoCanalData } from "@dental/shared";
import type { EndoCanalTableProps } from "./types";
import { MobileCanalCard } from "./MobileCanalCard";

interface MobileCanalsListProps extends EndoCanalTableProps {
	readonly onSelectSealer: (canal: EndoCanalData) => void;
}

export const MobileCanalsList: React.FC<MobileCanalsListProps> = ({
	canals,
	suggestedCanalNames,
	stageStamp,
	handleCanalChange,
	handleAdjustCanalLength,
	handleCanalLengthInputChange,
	handleSetCanalLength,
	handleRemoveCanal,
	renderIsoColorBadge,
	handleToggleCanalObliteration,
	onSelectSealer,
}) => (
	<div className="block md:hidden space-y-3" data-testid="endo-canals-mobile-cards">
		{canals.map((c, index) => (
			<MobileCanalCard
				key={c.id}
				canal={c}
				index={index}
				suggestedCanalNames={suggestedCanalNames}
				stageStamp={stageStamp}
				handleCanalChange={handleCanalChange}
				handleAdjustCanalLength={handleAdjustCanalLength}
				handleCanalLengthInputChange={handleCanalLengthInputChange}
				handleSetCanalLength={handleSetCanalLength}
				handleRemoveCanal={handleRemoveCanal}
				renderIsoColorBadge={renderIsoColorBadge}
				handleToggleCanalObliteration={handleToggleCanalObliteration}
				onSelectSealer={onSelectSealer}
			/>
		))}
	</div>
);
