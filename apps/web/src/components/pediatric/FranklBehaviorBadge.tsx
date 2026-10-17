import React from "react";
import {
	type FranklBehaviorBadgeProps,
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
	getFranklVectorIcon,
} from "./frankl/franklTypes";
import { FranklCompactToolbar } from "./frankl/FranklCompactToolbar";
import { FranklStrategiesCard } from "./frankl/FranklStrategiesCard";

export {
	type FranklBehaviorBadgeProps,
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
	getFranklVectorIcon,
};

export const FranklBehaviorBadge: React.FC<FranklBehaviorBadgeProps> = ({
	rating = 3,
	onChange,
	onQuickSelect,
	readOnly = false,
	showStrategies = true,
	compact = false,
	toolbar = false,
	className = "",
}) => {
	const activeDef = getFranklDefinition(rating);
	const ActiveIcon = getFranklVectorIcon(rating);

	if (toolbar || (compact && !readOnly && Boolean(onChange))) {
		return (
			<FranklCompactToolbar
				rating={rating}
				readOnly={readOnly}
				onChange={onChange}
				onQuickSelect={onQuickSelect}
				className={className}
			/>
		);
	}

	if (compact) {
		return (
			<div
				className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black select-none border transition-all ${className}`.trim()}
				style={{
					backgroundColor: activeDef.badgeBg,
					color: activeDef.badgeColor,
					borderColor: activeDef.badgeBorder,
				}}
				title={`${activeDef.nameRu}: ${activeDef.descriptionRu}`}
			>
				<ActiveIcon className="w-3.5 h-3.5 shrink-0" />
				<span>Франкл {activeDef.symbol}</span>
			</div>
		);
	}

	return (
		<FranklStrategiesCard
			rating={rating}
			activeDef={activeDef}
			readOnly={readOnly}
			showStrategies={showStrategies}
			onChange={onChange}
			onQuickSelect={onQuickSelect}
			className={className}
		/>
	);
};

export default FranklBehaviorBadge;
