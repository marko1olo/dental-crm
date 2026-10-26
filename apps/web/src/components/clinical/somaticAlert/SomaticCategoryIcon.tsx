import {
	Activity,
	AlertTriangle,
	Baby,
	HeartPulse,
	Pill,
	ShieldAlert,
} from "lucide-react";
import React from "react";
import type { SomaticStopFactor } from "@dental/shared";

export interface SomaticCategoryIconProps {
	readonly category: SomaticStopFactor["category"];
}

export const SomaticCategoryIcon: React.FC<SomaticCategoryIconProps> = ({ category }) => {
	switch (category) {
		case "allergy":
			return <Pill size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />;
		case "cardiovascular":
			return <HeartPulse size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />;
		case "anticoagulants":
			return <Activity size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />;
		case "bisphosphonates":
			return <AlertTriangle size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />;
		case "diabetes_pregnancy":
			return <Baby size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />;
		default:
			return <ShieldAlert size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />;
	}
};
