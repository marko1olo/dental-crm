/**
 * Single Tooth Button in Telegram Mini App
 * (DOMAIN: TELEGRAM MINI APP - LAYER 4 SUBCOMPONENT)
 */

import React from "react";
import { TOOTH_COMPLAINT_CATALOG } from "./toothComplaintCatalog.js";
import type { ToothComplaint } from "./toothPickerTypes.js";

export interface TelegramToothButtonProps {
	toothNum: number;
	complaint?: ToothComplaint | undefined;
	isActive: boolean;
	onClick: () => void;
}

export const TelegramToothButton: React.FC<TelegramToothButtonProps> = ({
	toothNum,
	complaint,
	isActive,
	onClick,
}) => {
	const catalogItem = complaint
		? TOOTH_COMPLAINT_CATALOG.find((c) => c.id === complaint.complaintType)
		: null;

	return (
		<button
			type="button"
			className={`tg-tooth-cell ${complaint ? "has-complaint" : ""} ${
				isActive ? "is-active" : ""
			} ${catalogItem?.badgeClass || ""}`}
			onClick={onClick}
			aria-label={`Зуб ${toothNum}${complaint ? `, жалоба: ${complaint.symptomLabel}` : ""}`}
		>
			<span className="tg-tooth-num">{toothNum}</span>
			{complaint && (
				<span className="tg-tooth-indicator">
					{complaint.complaintType === "acute_throbbing" && "⚡"}
					{complaint.complaintType === "fracture_filling" && "🦷"}
					{complaint.complaintType === "food_impaction_caries" && "🕳️"}
					{complaint.complaintType === "temperature_sensitivity" && "❄️"}
					{complaint.complaintType === "crown_implant" && "👑"}
				</span>
			)}
		</button>
	);
};
