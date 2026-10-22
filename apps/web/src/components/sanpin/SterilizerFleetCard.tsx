import type { SterilizerEquipment } from "@dental/shared";
import React from "react";
import { SterilizerFleetCardActions } from "./SterilizerFleetCardActions.js";
import { SterilizerFleetCardHeader } from "./SterilizerFleetCardHeader.js";
import { SterilizerFleetCardTechDetails } from "./SterilizerFleetCardTechDetails.js";

export interface SterilizerFleetCardProps {
	readonly item: SterilizerEquipment;
	readonly onEdit: (item: SterilizerEquipment) => void;
	readonly onToggleMaintenance: (item: SterilizerEquipment) => void;
	readonly onDecommission: (item: SterilizerEquipment) => void;
	readonly onDelete: (item: SterilizerEquipment) => void;
	readonly todayStr: string;
	readonly in30Days: string;
}

export function SterilizerFleetCard({
	item,
	onEdit,
	onToggleMaintenance,
	onDecommission,
	onDelete,
	todayStr,
	in30Days,
}: SterilizerFleetCardProps) {
	const isVerificationExpired = Boolean(
		item.verificationExpiryDate && item.verificationExpiryDate < todayStr,
	);
	const isVerificationDueSoon = Boolean(
		item.verificationExpiryDate &&
			item.verificationExpiryDate >= todayStr &&
			item.verificationExpiryDate <= in30Days,
	);

	return (
		<div
			className="sanpin-fleet-card"
			style={{
				background: "var(--paper-strong, #ffffff)",
				border: `1px solid ${
					item.status === "in_maintenance"
						? "rgba(217, 119, 6, 0.4)"
						: item.status === "decommissioned"
							? "rgba(220, 38, 38, 0.4)"
							: isVerificationExpired
								? "rgba(220, 38, 38, 0.4)"
								: "var(--line, #e2e8f0)"
				}`,
				borderRadius: "8px",
				padding: "0.85rem",
				display: "flex",
				flexDirection: "column",
				gap: "0.6rem",
				boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
				opacity: item.status === "decommissioned" ? 0.75 : 1,
			}}
		>
			<SterilizerFleetCardHeader item={item} onEdit={onEdit} />

			<SterilizerFleetCardTechDetails
				item={item}
				isVerificationExpired={isVerificationExpired}
				isVerificationDueSoon={isVerificationDueSoon}
			/>

			<SterilizerFleetCardActions
				item={item}
				onToggleMaintenance={onToggleMaintenance}
				onDecommission={onDecommission}
				onDelete={onDelete}
			/>
		</div>
	);
}
